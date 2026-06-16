import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TuiExpand } from '@taiga-ui/experimental';

/**
 * Компонент "FAQ".
 */
@Component({
    selector: 'app-faq',
    imports: [TuiExpand, TuiIcon, CommonModule],
    templateUrl: './faq.component.html',
    styleUrl: './faq.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent implements OnDestroy {
    /**
     * Признак того, что секция "Концепция сервер" открыта или скрыта.
     */
    protected isServerConcept: boolean = false;

    /**
     * Признак того, что секция "Забыл пароль" открыта или скрыта.
     */
    protected isPasswordLost: boolean = false;

    /**
     * Признак того, что секция "Проблемы входа" открыта или скрыта.
     */
    protected isTroubles: boolean = false;

    /**
     * Признак того, что секция "Информация о сезоне" открыта или скрыта.
     */
    protected isSeason: boolean = false;

    /**
     * Признак того, что секция "Как начать игру" открыта или скрыта.
     */
    protected isHowToStart: boolean = false;

    /**
     * Признак того, что секция "Баги или нарушения" открыта или скрыта.
     */
    protected isBagsOrViolation: boolean = false;

    /**
     * Признак того, что секция "Что делать если меня убили или обокрали" открыта или скрыта.
     */
    protected isDeathOrTheft: boolean = false;

    /**
     * Признак того, что секция "Предложения" открыта или скрыта.
     */
    protected isOffer: boolean = false;

    /**
     * Признак того, что секция "Попасть в команду" открыта или скрыта.
     */
    protected isTeam: boolean = false;

    /**
     * Признак раскрытия всех секций.
     */
    protected expandAll = false;

    /**
     * Сервис обнаружения изменений.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Показывать ли кнопку прокрутки наверх.
     */
    protected showScrollTop = false;

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
            const sentinel = document.getElementById('faq-scroll-sentinel');
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

    /**
     * Переключает состояние всех секций.
     */
    protected toggleAll(): void {
        const state = !this.expandAll;
        this.expandAll = state;
        this.isServerConcept = state;
        this.isPasswordLost = state;
        this.isTroubles = state;
        this.isSeason = state;
        this.isHowToStart = state;
        this.isBagsOrViolation = state;
        this.isDeathOrTheft = state;
        this.isOffer = state;
        this.isTeam = state;
    }
}
