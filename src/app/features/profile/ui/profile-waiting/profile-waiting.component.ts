import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { CalendarEvent, EventApiService } from '@entities/event';
import { NewsApiService, NewsDto } from '@entities/news';
import { eventStatus } from '@features/events/lib/event-status.function';
import { SettlementFinderService } from '@features/settlements/settlement-finder/settlement-finder.service';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '@shared/lib/relative-time';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, map, of } from 'rxjs';

/**
 * Сколько свежих новостей показывать.
 */
const NEWS_COUNT = 2;

/**
 * Ссылки «Осмотритесь».
 */
const EXPLORE_LINKS = [
    { key: 'settlements', icon: '@tui.house', link: '/settlements' },
    { key: 'gallery', icon: '@tui.image', link: '/gallery' },
    { key: 'diplomacy', icon: '@tui.handshake', link: '/diplomacy' },
    { key: 'rules', icon: '@tui.scroll-text', link: '/rules' },
] as const;

/**
 * Блок «Пока ждёте» для профиля без верификации.
 *
 * Пока анкета на проверке, профилю есть что показать: ближайшее событие,
 * свежие новости, подбор поселения и ссылки на разделы сервера.
 */
@Component({
    selector: 'app-profile-waiting',
    templateUrl: './profile-waiting.component.html',
    styleUrl: './profile-waiting.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe, RelativeTimeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileWaitingComponent {
    private readonly i18n = inject(I18nService);
    private readonly clock = inject(ClockService);
    private readonly finder = inject(SettlementFinderService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    protected readonly exploreLinks = EXPLORE_LINKS;

    /**
     * Ближайшие события (`null` — ещё грузятся).
     */
    private readonly events = toSignal(
        this.isBrowser
            ? inject(EventApiService)
                  .list(false, 5)
                  .pipe(catchError(() => of([] as CalendarEvent[])))
            : of([] as CalendarEvent[]),
        { initialValue: null }
    );

    /**
     * Свежие новости (`null` — ещё грузятся).
     */
    protected readonly news = toSignal(
        this.isBrowser
            ? inject(NewsApiService)
                  .getList()
                  .pipe(
                      map((list) => list.slice(0, NEWS_COUNT)),
                      catchError(() => of([] as NewsDto[]))
                  )
            : of([] as NewsDto[]),
        { initialValue: null }
    );

    /**
     * Идут ли ещё запросы.
     */
    protected readonly eventsLoading = computed(() => this.events() === null);

    /**
     * Ближайшее незавершённое событие.
     */
    protected readonly event = computed(
        () => this.events()?.find((event) => eventStatus(event, this.clock.now()) !== 'ended') ?? null
    );

    /**
     * Идёт ли событие прямо сейчас.
     */
    protected readonly live = computed(() => {
        const event = this.event();
        return !!event && eventStatus(event, this.clock.now()) === 'live';
    });

    /**
     * Обратный отсчёт до начала события.
     */
    protected readonly countdown = computed(() => {
        const event = this.event();
        return event ? formatCountdown(event.startsAt.getTime() - this.clock.now(), this.i18n.language()) : '';
    });

    /**
     * Дата и время начала: «сб, 10 октября, 19:00».
     */
    protected readonly when = computed(() => {
        const event = this.event();
        return event
            ? new Intl.DateTimeFormat(this.i18n.language(), {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
              }).format(event.startsAt)
            : '';
    });

    /**
     * Дата публикации новости.
     *
     * @param item Новость.
     * @returns Строка даты или `null`.
     */
    protected newsDate(item: NewsDto): string | null {
        return item.created_at ?? item.createdAt ?? null;
    }

    /**
     * Открывает подбор поселения.
     */
    protected openFinder(): void {
        this.finder.open().subscribe();
    }
}
