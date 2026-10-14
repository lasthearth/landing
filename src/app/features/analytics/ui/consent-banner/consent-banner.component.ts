import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    PLATFORM_ID,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { AnalyticsService } from '@core/services/analytics.service';
import { ConsentService } from '@core/services/consent.service';

/**
 * Класс на body, пока полоса видна: по нему страница получает отступ снизу,
 * а плавающие виджеты поднимаются над полосой (src/styles.css).
 */
const BODY_CLASS = 'lh-has-consent';

/**
 * CSS-переменная с высотой полосы — на корневом элементе документа.
 */
const HEIGHT_VAR = '--lh-consent-h';

/**
 * Полоса согласия на аналитические cookies у нижнего края экрана.
 *
 * Компонент смонтирован на каждой странице (вставлен в app.component.html),
 * поэтому он же поднимает {@link AnalyticsService}: сервис решает по
 * сохранённому согласию, подключать ли счётчики. Так корневой компонент
 * не обрастает деталями аналитики.
 */
@Component({
    standalone: true,
    selector: 'app-consent-banner',
    imports: [RouterLink, TranslatePipe, TuiIcon],
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
     * Сама полоса — чтобы мерить её высоту.
     */
    private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');

    private readonly document = inject(DOCUMENT);

    constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }

        let observer: ResizeObserver | null = null;

        // Высота полосы меняется при переносе строк и смене языка,
        // поэтому отступ страницы следует за ней, а не задан числом.
        effect(() => {
            const element = this.bar()?.nativeElement;

            observer?.disconnect();
            observer = null;

            if (!element) {
                this.release();
                return;
            }

            this.document.body.classList.add(BODY_CLASS);
            observer = new ResizeObserver(() => {
                this.document.documentElement.style.setProperty(HEIGHT_VAR, `${element.offsetHeight}px`);
            });
            observer.observe(element);
        });

        inject(DestroyRef).onDestroy(() => {
            observer?.disconnect();
            this.release();
        });
    }

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

    /**
     * Снимает отступ страницы и подъём виджетов, когда полосы больше нет.
     */
    private release(): void {
        this.document.body.classList.remove(BODY_CLASS);
        this.document.documentElement.style.removeProperty(HEIGHT_VAR);
    }
}
