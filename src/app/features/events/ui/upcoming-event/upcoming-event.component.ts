import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { CalendarEvent, EventApiService } from '@entities/event';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '@shared/lib/relative-time';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, of } from 'rxjs';
import { eventStatus } from '../../lib/event-status.function';

/**
 * Сколько ближайших событий запрашивать (первое показывается, остальные — счётчиком).
 */
const LOOKAHEAD = 10;

/**
 * Блок «Ближайшее событие» для главной: название, время, место и обратный отсчёт.
 *
 * Без предстоящих событий не выводит ничего. При пререндере не запрашивает API.
 */
@Component({
    selector: 'app-upcoming-event',
    templateUrl: './upcoming-event.component.html',
    styleUrl: './upcoming-event.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingEventComponent {
    private readonly i18n = inject(I18nService);
    private readonly clock = inject(ClockService);

    /**
     * Ближайшие события (пусто при пререндере и при ошибке).
     */
    private readonly events = toSignal(
        isPlatformBrowser(inject(PLATFORM_ID))
            ? inject(EventApiService)
                  .list(false, LOOKAHEAD)
                  .pipe(catchError(() => of([] as CalendarEvent[])))
            : of([] as CalendarEvent[]),
        { initialValue: [] as CalendarEvent[] }
    );

    /**
     * Ближайшее ещё не завершившееся событие.
     */
    protected readonly event = computed(
        () => this.events().find((event) => eventStatus(event, this.clock.now()) !== 'ended') ?? null
    );

    /**
     * Сколько ещё событий впереди.
     */
    protected readonly moreCount = computed(() => {
        const now = this.clock.now();
        return Math.max(0, this.events().filter((event) => eventStatus(event, now) !== 'ended').length - 1);
    });

    /**
     * Идёт ли событие прямо сейчас.
     */
    protected readonly live = computed(() => {
        const event = this.event();
        return !!event && eventStatus(event, this.clock.now()) === 'live';
    });

    /**
     * Обратный отсчёт до начала.
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
}
