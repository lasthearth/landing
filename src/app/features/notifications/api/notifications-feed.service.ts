import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, fromEvent, map, of, startWith, switchMap, timer } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';
import { BROADCAST_USER_ID, NotificationApiService, NotificationDto } from '@entities/notification';
import { UserService } from '@entities/user';
import { parseDateInput } from '@shared/lib/relative-time';
import {
    FeedNotification,
    NOTIFICATION_CATEGORIES,
    NotificationCategory,
    NotificationPrefs,
} from '../model/feed-notification';

/**
 * Как часто обновлять уведомления, пока вкладка открыта (мс).
 */
const POLL_INTERVAL = 2 * 60 * 1000;

/**
 * Префикс ключа localStorage с прочитанными общими уведомлениями (для каждого пользователя свой).
 */
const READ_STORAGE_PREFIX = 'lh_notifications_read:';

/**
 * Сколько id прочитанных общих уведомлений помнить.
 */
const READ_LIMIT = 200;

/**
 * Ключ localStorage с настройками колокольчика (общий для браузера).
 */
const PREFS_STORAGE_KEY = 'lh_notifications_prefs';

/**
 * Настройки по умолчанию: показывать всё.
 */
const DEFAULT_PREFS: NotificationPrefs = { news: true, events: true, personal: true };

/**
 * Хранимое состояние прочитанных общих уведомлений.
 */
interface ReadState {
    /**
     * Прочитанные id.
     */
    ids: string[];
}

/**
 * Лента уведомлений для колокольчика.
 *
 * Личные уведомления (например, админам — «игрок сменил ник») отмечаются прочитанными на сервере.
 * Общие (новая новость) — только в браузере игрока: на сервере у такого уведомления одно состояние
 * на всех, и пометка одного игрока погасила бы его у остальных.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
    /**
     * API уведомлений.
     */
    private readonly api = inject(NotificationApiService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Обёртка над localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Документ — следим за видимостью вкладки.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Ссылка на жизненный цикл.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Работаем в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Уведомления с сервера.
     */
    private readonly raw = signal<NotificationDto[]>([]);

    /**
     * Прочитанные общие уведомления этого пользователя.
     */
    private readonly readBroadcasts = signal<Set<string>>(new Set());

    /**
     * Личные уведомления, отмеченные прочитанными в этой сессии (до ответа сервера).
     */
    private readonly readLocally = signal<Set<string>>(new Set());

    /**
     * Какие категории показывать (хранится в браузере, сервер настроек пока не знает).
     */
    public readonly prefs = signal<NotificationPrefs>(this.loadPrefs());

    /**
     * Сколько категорий скрыто.
     */
    public readonly hiddenCount = computed(
        () => NOTIFICATION_CATEGORIES.filter((category) => !this.prefs()[category]).length
    );

    /**
     * Пользователь, для которого загружена лента.
     */
    private userId: string | null = null;

    /**
     * Опрос уже запущен.
     */
    private started = false;

    /**
     * Уведомления для вывода.
     */
    public readonly allItems = computed<FeedNotification[]>(() => {
        const readBroadcasts = this.readBroadcasts();
        const readLocally = this.readLocally();

        return this.raw().map((dto) => {
            const broadcast = dto.user_id === BROADCAST_USER_ID;
            const serverRead = dto.state === 'READ' || dto.state === 2;

            const link = broadcast ? this.broadcastLink(dto.title) : null;

            return {
                id: dto.id,
                title: dto.title,
                message: dto.message,
                createdAt: parseDateInput(dto.created_at),
                broadcast,
                read: broadcast ? readBroadcasts.has(dto.id) : serverRead || readLocally.has(dto.id),
                // Уведомление о новости ведёт к ленте новостей, о событии — в календарь.
                link,
                category: !broadcast ? 'personal' : link === '/events' ? 'events' : 'news',
            } satisfies FeedNotification;
        });
    });

    /**
     * Уведомления, которые игрок решил видеть.
     */
    public readonly items = computed(() => {
        const prefs = this.prefs();
        return this.allItems().filter((item) => prefs[item.category]);
    });

    /**
     * Сколько непрочитанных.
     */
    public readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

    /**
     * Запускает загрузку и опрос: при входе пользователя и пока вкладка видна.
     */
    public start(): void {
        if (!this.isBrowser || this.started) {
            return;
        }

        this.started = true;
        const visible$ = fromEvent(this.document, 'visibilitychange').pipe(
            startWith(null),
            map(() => this.document.visibilityState === 'visible')
        );

        this.userService.authState$
            .pipe(
                switchMap((isAuth) => {
                    if (!isAuth || !this.userService.userId) {
                        this.reset();
                        return EMPTY;
                    }

                    this.useUser(this.userService.userId);
                    return visible$.pipe(switchMap((visible) => (visible ? timer(0, POLL_INTERVAL) : EMPTY)));
                }),
                switchMap(() => this.api.list().pipe(catchError(() => of(null)))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((list) => {
                if (list) {
                    this.apply(list);
                }
            });
    }

    /**
     * Отмечает уведомление прочитанным.
     *
     * @param item Уведомление.
     */
    public markRead(item: FeedNotification): void {
        if (item.read) {
            return;
        }

        if (item.broadcast) {
            this.rememberBroadcasts([item.id]);
            return;
        }

        this.readLocally.update((set) => new Set(set).add(item.id));
        this.api
            .markAsRead(item.id)
            .pipe(catchError(() => of(undefined)))
            .subscribe();
    }

    /**
     * Включает или выключает категорию.
     *
     * @param category Категория.
     * @param enabled Показывать ли её.
     */
    public setPref(category: NotificationCategory, enabled: boolean): void {
        const next = { ...this.prefs(), [category]: enabled };
        this.prefs.set(next);
        this.storage.setItem(PREFS_STORAGE_KEY, next);
    }

    /**
     * Отмечает все видимые уведомления прочитанными.
     */
    public markAllRead(): void {
        for (const item of this.items()) {
            this.markRead(item);
        }
    }

    /**
     * Применяет свежий список с сервера.
     *
     * При самом первом открытии ленты старые общие уведомления считаем прочитанными,
     * чтобы новый игрок не увидел сразу 15 «новых» новостей.
     *
     * @param list Уведомления.
     */
    private apply(list: NotificationDto[]): void {
        const key = this.storageKey();
        if (key && this.storage.getItem<ReadState>(key) === null) {
            this.rememberBroadcasts(list.filter((dto) => dto.user_id === BROADCAST_USER_ID).map((dto) => dto.id));
        }

        this.raw.set(list);
    }

    /**
     * Переключает ленту на пользователя: подхватывает его прочитанные общие уведомления.
     *
     * @param userId Идентификатор пользователя.
     */
    private useUser(userId: string): void {
        if (this.userId === userId) {
            return;
        }

        this.userId = userId;
        const stored = this.storage.getItem<ReadState>(this.storageKey()!);
        this.readBroadcasts.set(new Set(Array.isArray(stored?.ids) ? stored.ids : []));
        this.readLocally.set(new Set());
        this.raw.set([]);
    }

    /**
     * Очищает ленту при выходе.
     */
    private reset(): void {
        this.userId = null;
        this.raw.set([]);
        this.readBroadcasts.set(new Set());
        this.readLocally.set(new Set());
    }

    /**
     * Запоминает прочитанные общие уведомления.
     *
     * @param ids Идентификаторы.
     */
    private rememberBroadcasts(ids: string[]): void {
        const key = this.storageKey();
        if (!key) {
            return;
        }

        const next = new Set(this.readBroadcasts());
        ids.forEach((id) => next.add(id));
        this.readBroadcasts.set(next);
        this.storage.setItem(key, { ids: [...next].slice(-READ_LIMIT) } satisfies ReadState);
    }

    /**
     * Куда ведёт общее уведомление: о новости — к ленте на главной, о событии — в календарь.
     *
     * @param title Заголовок уведомления.
     * @returns Ссылка или `null`.
     */
    private broadcastLink(title: string): string | null {
        if (/событи|event/i.test(title)) {
            return '/events';
        }

        return /новост|news/i.test(title) ? '/' : null;
    }

    /**
     * Читает настройки из браузера, подставляя значения по умолчанию.
     *
     * @returns Настройки.
     */
    private loadPrefs(): NotificationPrefs {
        const stored = this.isBrowser ? this.storage.getItem<Partial<NotificationPrefs>>(PREFS_STORAGE_KEY) : null;
        const prefs = { ...DEFAULT_PREFS };

        for (const category of NOTIFICATION_CATEGORIES) {
            if (typeof stored?.[category] === 'boolean') {
                prefs[category] = stored[category];
            }
        }

        return prefs;
    }

    /**
     * Ключ localStorage текущего пользователя.
     */
    private storageKey(): string | null {
        return this.userId ? `${READ_STORAGE_PREFIX}${this.userId}` : null;
    }
}
