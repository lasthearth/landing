import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { TuiExpand, TuiIcon } from '@taiga-ui/core';

/**
 * Компонент страницы "Публичная оферта".
 *
 * Отображает документ в виде раскрывающихся карточек в едином стиле с FAQ и Правилами.
 */
@Component({
    selector: 'app-public-offer',
    standalone: true,
    imports: [TuiIcon, CommonModule, TuiExpand],
    templateUrl: './public-offer.component.html',
    styleUrl: './public-offer.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicOfferComponent implements OnDestroy {
    /**
     * Признак раскрытия секции "Термины и определения".
     */
    protected isTerms: boolean = false;

    /**
     * Признак раскрытия секции "Общие положения".
     */
    protected isGeneralProvisions: boolean = false;

    /**
     * Признак раскрытия секции "Права и обязанности сторон".
     */
    protected isRightsAndObligations: boolean = false;

    /**
     * Признак раскрытия секции "Ответственность сторон".
     */
    protected isResponsibility: boolean = false;

    /**
     * Признак раскрытия секции "Условия возврата".
     */
    protected isTermsOfReturn: boolean = false;

    /**
     * Признак раскрытия секции "Персональные данные".
     */
    protected isPersonalData: boolean = false;

    /**
     * Признак раскрытия секции "Законодательство и разрешение споров".
     */
    protected isLegislation: boolean = false;

    /**
     * Признак раскрытия секции "Реквизиты Исполнителя".
     */
    protected isRequisites: boolean = false;

    /**
     * Признак раскрытия всех секций.
     */
    protected expandAll: boolean = false;

    /**
     * Показывать ли кнопку прокрутки наверх.
     */
    protected showScrollTop: boolean = false;

    /**
     * Сервис обнаружения изменений.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Наблюдатель за пересечением верхнего маркера.
     */
    private readonly observer: IntersectionObserver;

    constructor() {
        this.observer = new IntersectionObserver(
            ([entry]) => {
                const shouldShow = !entry.isIntersecting;
                if (this.showScrollTop !== shouldShow) {
                    this.showScrollTop = shouldShow;
                    this.cdr.markForCheck();
                }
            },
            { threshold: 0 }
        );

        queueMicrotask(() => {
            const sentinel = document.getElementById('offer-scroll-sentinel');
            if (sentinel) {
                this.observer.observe(sentinel);
            }
        });
    }

    /**
     * @inheritdoc
     */
    public ngOnDestroy(): void {
        this.observer.disconnect();
    }

    /**
     * Переключает состояние всех секций.
     */
    protected toggleAll(): void {
        const state = !this.expandAll;
        this.expandAll = state;
        this.isTerms = state;
        this.isGeneralProvisions = state;
        this.isRightsAndObligations = state;
        this.isResponsibility = state;
        this.isTermsOfReturn = state;
        this.isPersonalData = state;
        this.isLegislation = state;
        this.isRequisites = state;
    }

    /**
     * Прокручивает страницу наверх.
     */
    protected scrollToTop(): void {
        const layout = document.querySelector('app-layout');
        if (layout) {
            layout.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}
