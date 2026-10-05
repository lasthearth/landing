import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { mapDtoToNews, NewsApiService } from '@entities/news';
import { LocalStorageService } from '@core/services/local-storage.service';
import { ClockService } from '@shared/lib/clock';
import { Announcement } from '../model/announcement';

/**
 * Ключ localStorage со списком скрытых игроком объявлений.
 */
const DISMISSED_STORAGE_KEY = 'lh-dismissed-announcements';

/**
 * Сколько скрытых объявлений помнить (старые всё равно истекли).
 */
const DISMISSED_LIMIT = 20;

/**
 * Объявления для баннера над шапкой.
 *
 * Пока у бэкенда нет отдельного эндпоинта, объявлением считается новость
 * со скрытой меткой баннера (её ставит галочка в форме создания новости).
 * Показывается самое свежее действующее объявление, которое игрок не закрыл.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementService {
    /**
     * API новостей.
     */
    private readonly newsApi = inject(NewsApiService);

    /**
     * Обёртка над localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Общие «часы» приложения — тикают раз в минуту.
     */
    private readonly clock = inject(ClockService);

    /**
     * Работаем в браузере (на сервере и при пререндере баннер не нужен).
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Все объявления из новостей, от новых к старым.
     */
    private readonly announcements = signal<Announcement[]>([]);

    /**
     * Объявления, которые игрок закрыл.
     */
    private readonly dismissed = signal<string[]>(this.readDismissed());

    /**
     * Загрузка уже запускалась.
     */
    private requested = false;

    /**
     * Текущее объявление для показа или `null`.
     */
    public readonly current = computed<Announcement | null>(() => {
        const now = this.clock.now();
        const dismissed = this.dismissed();

        return (
            this.announcements().find(
                (announcement) => Date.parse(announcement.until) > now && !dismissed.includes(announcement.id)
            ) ?? null
        );
    });

    /**
     * Загружает объявления один раз за сессию.
     */
    public load(): void {
        if (!this.isBrowser || this.requested) {
            return;
        }

        this.requested = true;

        this.newsApi.getList().subscribe({
            next: (list) => {
                const announcements = list
                    .map(mapDtoToNews)
                    .filter((news) => news.banner)
                    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
                    .map(
                        (news): Announcement => ({
                            id: news.id,
                            title: news.title,
                            until: news.banner!.until,
                            countdown: news.banner!.countdown,
                        })
                    );

                this.announcements.set(announcements);
            },
            // Баннер необязателен: без новостей просто ничего не показываем.
            error: () => undefined,
        });
    }

    /**
     * Скрывает объявление для этого игрока.
     *
     * @param id Идентификатор объявления.
     */
    public dismiss(id: string): void {
        const next = [id, ...this.dismissed().filter((item) => item !== id)].slice(0, DISMISSED_LIMIT);
        this.dismissed.set(next);
        this.storage.setItem(DISMISSED_STORAGE_KEY, next);
    }

    /**
     * Читает скрытые объявления из localStorage.
     */
    private readDismissed(): string[] {
        if (!this.isBrowser) {
            return [];
        }

        const stored = this.storage.getItem<string[]>(DISMISSED_STORAGE_KEY);
        return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : [];
    }
}
