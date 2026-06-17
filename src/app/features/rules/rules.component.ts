import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RuleSectionComponent } from './ui/rule-section/rule-section.component';
import { TerminologyComponent } from './components/terminology/terminology.component';
import { BaseComponent } from './components/base/base.component';
import { AboutSettlementsComponent } from './components/about-settlements/about-settlements.component';
import { PlayersActionsComponent } from './components/players-actions/players-actions.component';
import { ColonizationComponent } from './components/colonization/colonization.component';
import { MilitaryActionsComponent } from './components/military-actions/military-actions.component';
import { AdminRightsComponent } from './components/admin-rights/admin-rights.component';
import { ScrollService } from './services/scroll.service';
import { GlobalExpandService } from './services/global-expand.service';

/**
 * Компонент правил сервера.
 */
@Component({
    standalone: true,
    selector: 'app-rules',
    imports: [
        CommonModule,
        TuiIcon,
        TranslatePipe,
        TerminologyComponent,
        RuleSectionComponent,
        BaseComponent,
        AboutSettlementsComponent,
        PlayersActionsComponent,
        ColonizationComponent,
        MilitaryActionsComponent,
        AdminRightsComponent,
    ],
    templateUrl: './rules.component.html',
    styleUrls: ['./rules.component.less', './styles/rules.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesComponent implements OnDestroy {
    /**
     * Сервис прокрутки.
     */
    private readonly scrollService: ScrollService = inject(ScrollService);

    /**
     * Сервис глобального управления раскрытием всех секций.
     */
    protected readonly globalExpandService = inject(GlobalExpandService);

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

        // Откладываем начало наблюдения до следующего рендера,
        // чтобы маркер уже был в DOM.
        queueMicrotask(() => {
            const sentinel = document.getElementById('rules-scroll-sentinel');
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
        this.globalExpandService.toggle();
    }

    /**
     * Прокручивает страницу наверх.
     */
    protected scrollToTop(): void {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Выполняет прокрутку к элементу.
     *
     * @param elementId - Идентификатор элемента
     */
    protected scrollToElement(elementId: string): void {
        this.scrollService.scrollToElement(elementId);
    }
}
