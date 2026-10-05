import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, map, Observable, of } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { LocalStorageService } from '@core/services/local-storage.service';
import { DiscordApiService } from '@entities/discord';
import { NewsApiService } from '@entities/news';
import { parseDateInput } from '@shared/lib/relative-time';
import { sectionByUrl } from '../lib/section-by-url.function';
import { ContentSection } from '../model/content-section';

/**
 * Ключ localStorage: когда игрок последний раз заходил в каждый раздел.
 */
const LAST_SEEN_STORAGE_KEY = 'lh-last-seen-sections';

/**
 * Ключ sessionStorage: время самых свежих материалов (чтобы не спрашивать API на каждой перезагрузке).
 */
const LATEST_CACHE_KEY = 'lh-latest-content';

/**
 * Сколько живёт кэш свежих материалов (мс).
 */
const LATEST_CACHE_TTL = 10 * 60 * 1000;

/**
 * Через сколько после загрузки страницы проверять новое (мс) — не мешаем первому экрану.
 */
const CHECK_DELAY = 3000;

/**
 * Все разделы.
 */
const SECTIONS: readonly ContentSection[] = ['news', 'diplomacy', 'gallery'];

/**
 * Время по разделам.
 */
type SectionTimes = Partial<Record<ContentSection, number>>;

/**
 * «Новое с прошлого визита» для пунктов меню.
 *
 * Помнит, когда игрок открывал раздел, и раз в сессию узнаёт время самого свежего
 * материала (новость, заявление дипломатии, скриншот). Если материал новее визита — в меню точка.
 * При самом первом визите всё считается просмотренным, чтобы не засыпать новичка точками.
 */
@Injectable({ providedIn: 'root' })
export class NewContentService {
    /**
     * Роутер — отмечаем раздел просмотренным при переходе.
     */
    private readonly router = inject(Router);

    /**
     * Обёртка над localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * API новостей.
     */
    private readonly newsApi = inject(NewsApiService);

    /**
     * API Discord-прокси.
     */
    private readonly discordApi = inject(DiscordApiService);

    /**
     * Ссылка на жизненный цикл сервиса.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Работаем в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Когда игрок последний раз открывал разделы.
     */
    private readonly lastSeen = signal<SectionTimes>({});

    /**
     * Время самых свежих материалов разделов.
     */
    private readonly latest = signal<SectionTimes>({});

    /**
     * Проверка уже запущена.
     */
    private started = false;

    /**
     * Разделы, где есть новое.
     */
    public readonly fresh = computed(() => {
        const seen = this.lastSeen();
        const latest = this.latest();
        return new Set(SECTIONS.filter((section) => (latest[section] ?? 0) > (seen[section] ?? Infinity)));
    });

    /**
     * Есть ли новое в «Медиа» (пока это только галерея).
     */
    public readonly mediaFresh = computed(() => this.fresh().has('gallery'));

    /**
     * Есть ли новое хоть где-то — для кнопки мобильного меню.
     */
    public readonly anyFresh = computed(() => this.fresh().size > 0);

    /**
     * Запускает отслеживание: один раз на приложение.
     */
    public start(): void {
        if (!this.isBrowser || this.started) {
            return;
        }

        this.started = true;
        this.lastSeen.set(this.readLastSeen());

        // До окончания первой навигации router.url — это «/», а не открытая страница.
        if (this.router.navigated) {
            this.markSeenByUrl(this.router.url);
        }

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => this.markSeenByUrl(event.urlAfterRedirects));

        const cached = this.readLatestCache();
        if (cached) {
            this.latest.set(cached);
            return;
        }

        setTimeout(() => this.fetchLatest(), CHECK_DELAY);
    }

    /**
     * Проверяет, есть ли новое в разделе.
     *
     * @param section Раздел.
     */
    public isFresh(section: ContentSection): boolean {
        return this.fresh().has(section);
    }

    /**
     * Отмечает раздел открытой страницы просмотренным.
     *
     * @param url Адрес страницы.
     */
    private markSeenByUrl(url: string): void {
        const section = sectionByUrl(url);

        if (!section) {
            return;
        }

        const seenAt = Math.max(Date.now(), this.latest()[section] ?? 0);
        this.lastSeen.update((seen) => ({ ...seen, [section]: seenAt }));
        this.storage.setItem(LAST_SEEN_STORAGE_KEY, this.lastSeen());
    }

    /**
     * Узнаёт время самых свежих материалов — по одному лёгкому запросу на раздел.
     */
    private fetchLatest(): void {
        const sources: Record<ContentSection, Observable<number | null>> = {
            news: this.newsApi.getLatest().pipe(map((news) => this.toTime(news?.created_at ?? news?.createdAt))),
            diplomacy: this.discordApi
                .getMessages$(environment.discordDiplomacyChannelId, 1)
                .pipe(map((page) => this.toTime(page.messages?.[0]?.timestamp))),
            gallery: this.discordApi
                .getImages$(environment.discordScreenshotsChannelId, 1)
                .pipe(map((page) => this.toTime(page.images?.[0]?.timestamp))),
        };

        for (const section of SECTIONS) {
            sources[section]
                .pipe(
                    catchError(() => of(null)),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((time) => {
                    if (time === null) {
                        return;
                    }

                    this.latest.update((latest) => ({ ...latest, [section]: time }));
                    this.writeLatestCache();
                });
        }
    }

    /**
     * Переводит дату из API в миллисекунды.
     *
     * @param value Дата из API.
     */
    private toTime(value: string | undefined): number | null {
        return parseDateInput(value)?.getTime() ?? null;
    }

    /**
     * Читает время визитов. При первом визите считает всё просмотренным.
     */
    private readLastSeen(): SectionTimes {
        const stored = this.storage.getItem<SectionTimes>(LAST_SEEN_STORAGE_KEY);

        if (stored && typeof stored === 'object') {
            const now = Date.now();
            // Раздел, которого ещё нет в сохранённых (добавлен позже), тоже считаем просмотренным сейчас.
            return Object.fromEntries(
                SECTIONS.map((section) => [section, Number(stored[section]) || now])
            ) as SectionTimes;
        }

        const now = Date.now();
        const initial = Object.fromEntries(SECTIONS.map((section) => [section, now])) as SectionTimes;
        this.storage.setItem(LAST_SEEN_STORAGE_KEY, initial);
        return initial;
    }

    /**
     * Читает кэш свежих материалов из sessionStorage.
     */
    private readLatestCache(): SectionTimes | null {
        try {
            const raw = sessionStorage.getItem(LATEST_CACHE_KEY);
            const parsed = raw ? (JSON.parse(raw) as { latest: SectionTimes; savedAt: number }) : null;
            return parsed && Date.now() - parsed.savedAt < LATEST_CACHE_TTL ? parsed.latest : null;
        } catch {
            return null;
        }
    }

    /**
     * Сохраняет кэш свежих материалов в sessionStorage.
     */
    private writeLatestCache(): void {
        try {
            sessionStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ latest: this.latest(), savedAt: Date.now() }));
        } catch {
            // Хранилище недоступно — просто спросим API ещё раз в следующий раз.
        }
    }
}
