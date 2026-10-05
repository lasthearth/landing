import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { ClockService } from '@shared/lib/clock';
import { parseDateInput } from '@shared/lib/relative-time';
import { RelativeTimeComponent } from '../relative-time/relative-time.component';

/**
 * Миллисекунд в часе.
 */
const HOUR = 3_600_000;

/**
 * Сколько ждёт заявка: «2 часа назад», а если дольше порога — подсветка «давно ждёт».
 *
 * Для рабочих мест (анкеты, заявки, выдача покупок): модератор сразу видит, что залежалось.
 * Если даты нет, ничего не показывает.
 */
@Component({
    selector: 'app-waiting-badge',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, RelativeTimeComponent],
    templateUrl: './waiting-badge.component.html',
    styleUrl: './waiting-badge.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitingBadgeComponent {
    /**
     * Когда заявка подана (ISO, unix-время или Date).
     */
    public readonly since = input<Date | string | number | null | undefined>(null);

    /**
     * Через сколько часов заявка считается залежавшейся.
     */
    public readonly staleHours = input(24);

    /**
     * Общие «часы» приложения.
     */
    private readonly clock = inject(ClockService);

    /**
     * Дата подачи.
     */
    protected readonly date = computed(() => parseDateInput(this.since()));

    /**
     * Заявка ждёт дольше порога.
     */
    protected readonly stale = computed(() => {
        const date = this.date();
        return !!date && this.clock.now() - date.getTime() > this.staleHours() * HOUR;
    });
}
