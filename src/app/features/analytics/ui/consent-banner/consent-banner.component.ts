import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { AnalyticsService } from '@core/services/analytics.service';
import { ConsentService } from '@core/services/consent.service';

/**
 * Плашка согласия на аналитические cookies.
 *
 * Компонент смонтирован на каждой странице (вставлен в app.component.html),
 * поэтому он же поднимает {@link AnalyticsService}: сервис решает по
 * сохранённому согласию, подключать ли счётчики. Так корневой компонент
 * не обрастает деталями аналитики.
 */
@Component({
    standalone: true,
    selector: 'app-consent-banner',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './consent-banner.component.html',
    styleUrl: './consent-banner.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentBannerComponent {
    /**
     * Решение пользователя об аналитических cookies.
     */
    private readonly consent = inject(ConsentService);

    /**
     * Аналитика: инжектится здесь, чтобы счётчики поднимались вместе с плашкой.
     */
    protected readonly analytics: AnalyticsService = inject(AnalyticsService);

    /**
     * Плашка нужна только пока пользователь не ответил.
     */
    protected readonly visible = computed(() => this.consent.analytics() === null);

    /**
     * Пользователь разрешил аналитику.
     */
    protected allow(): void {
        this.consent.setAnalytics(true);
    }

    /**
     * Пользователь отказался от аналитики: счётчики не подключаются вовсе.
     */
    protected deny(): void {
        this.consent.setAnalytics(false);
    }
}
