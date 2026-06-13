import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { TuiExpand, TuiIcon } from '@taiga-ui/core';

/**
 * Компонент страницы "Политика конфиденциальности".
 *
 * Отображает документ в виде раскрывающихся карточек в едином стиле с FAQ и Правилами.
 */
@Component({
    standalone: true,
    selector: 'app-privacy-policy',
    imports: [TuiIcon, CommonModule, TuiExpand],
    templateUrl: './privacy-policy.component.html',
    styleUrl: './privacy-policy.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyComponent implements OnDestroy {
    /**
     * Признак раскрытия секции "Общие положения".
     */
    protected isBase: boolean = false;

    /**
     * Признак раскрытия секции "Персональная информация".
     */
    protected isPersonalInformation: boolean = false;

    /**
     * Признак раскрытия секции "Цели сбора и обработки".
     */
    protected isPurposes: boolean = false;

    /**
     * Признак раскрытия секции "Правовые основания".
     */
    protected isLegalGrounds: boolean = false;

    /**
     * Признак раскрытия секции "Порядок сбора и хранения".
     */
    protected isProcedure: boolean = false;

    /**
     * Признак раскрытия секции "Меры безопасности".
     */
    protected isSecurityMeasures: boolean = false;

    /**
     * Признак раскрытия секции "Заключительные положения".
     */
    protected isFinalProvisions: boolean = false;

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
            const sentinel = document.getElementById('privacy-scroll-sentinel');
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
        this.isBase = state;
        this.isPersonalInformation = state;
        this.isPurposes = state;
        this.isLegalGrounds = state;
        this.isProcedure = state;
        this.isSecurityMeasures = state;
        this.isFinalProvisions = state;
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
