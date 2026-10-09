import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { CalendarEvent } from '@entities/event';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '@shared/lib/relative-time';
import { TuiIcon } from '@taiga-ui/core';
import { EventAttendanceService } from '../../api/event-attendance.service';

/**
 * Сколько ближайших событий показывать в профиле.
 */
const SHOWN = 3;

/**
 * «Мои события» в профиле: ближайшие события, на которые записан игрок.
 * Пустой блок не показывается.
 */
@Component({
    selector: 'app-my-events',
    templateUrl: './my-events.component.html',
    styleUrl: './my-events.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEventsComponent {
    private readonly attendance = inject(EventAttendanceService);
    private readonly clock = inject(ClockService);
    private readonly i18n = inject(I18nService);

    /**
     * Ближайшие события игрока.
     */
    protected readonly events = computed(() => (this.attendance.mine() ?? []).slice(0, SHOWN));

    /**
     * Сколько ещё событий не поместилось.
     */
    protected readonly more = computed(() => Math.max(0, (this.attendance.mine()?.length ?? 0) - SHOWN));

    /**
     * Когда начнётся: «через 2 дня» или «идёт сейчас».
     *
     * @param event Событие.
     * @returns Подпись.
     */
    protected when(event: CalendarEvent): string {
        const left = event.startsAt.getTime() - this.clock.now();
        if (left <= 0) {
            return this.i18n.translate('events.mine.live');
        }
        return this.i18n.translate('events.mine.startsIn', { time: formatCountdown(left, this.i18n.language()) });
    }

    /**
     * Дата и время начала: «сб, 10 окт., 19:30».
     *
     * @param event Событие.
     * @returns Подпись.
     */
    protected date(event: CalendarEvent): string {
        return new Intl.DateTimeFormat(this.i18n.language(), {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(event.startsAt);
    }

    /**
     * Идёт ли событие сейчас.
     *
     * @param event Событие.
     * @returns Признак.
     */
    protected live(event: CalendarEvent): boolean {
        return event.startsAt.getTime() <= this.clock.now();
    }
}
