import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ClockService } from '@shared/lib/clock';
import { formatCountdown } from '../../lib/format-countdown.function';
import { Announcement } from '../../model/announcement';

/**
 * Узкая полоса объявления над шапкой сайта.
 *
 * Только отображение: откуда взялось объявление и куда сохраняется «закрыть», решает родитель.
 */
@Component({
    selector: 'app-announcement-bar',
    standalone: true,
    imports: [RouterLink, TuiIcon, TranslatePipe],
    templateUrl: './announcement-bar.component.html',
    styleUrl: './announcement-bar.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent {
    /**
     * Объявление.
     */
    public readonly announcement = input.required<Announcement>();

    /**
     * Режим предпросмотра в форме: без ссылки и без кнопки закрытия.
     */
    public readonly preview = input(false);

    /**
     * Игрок закрыл объявление.
     */
    public readonly dismissed = output<void>();

    /**
     * Общие «часы» приложения.
     */
    private readonly clock = inject(ClockService);

    /**
     * Сервис переводов (язык для склонений в отсчёте).
     */
    private readonly i18n = inject(I18nService);

    /**
     * Подпись обратного отсчёта («2 дня», «5 ч 12 мин») или пустая строка.
     */
    protected readonly countdown = computed(() => {
        const announcement = this.announcement();

        if (!announcement.countdown) {
            return '';
        }

        return formatCountdown(Date.parse(announcement.until) - this.clock.now(), this.i18n.language());
    });
}
