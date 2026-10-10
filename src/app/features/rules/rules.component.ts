import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
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
import { ScrollAnchorDirective } from './directives/scroll-anchor.directive';
import { RulesSearchComponent } from './ui/rules-search/rules-search.component';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { RulesTocComponent } from './ui/rules-toc/rules-toc.component';
import { RULES_TOC_SECTIONS } from './config/rules-toc-sections.constant';
import { SectionStateService } from './services/section-state.service';

/**
 * Сколько ждать раскрытия раздела перед прокруткой к нему (мс).
 */
const SECTION_EXPAND_DELAY = 400;

/**
 * Компонент правил сервера.
 */
@Component({
    standalone: true,
    selector: 'app-rules',
    imports: [PageHeaderComponent, 
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
        ScrollAnchorDirective,
        RulesSearchComponent,
        RulesTocComponent,
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
     * Состояние раскрытия разделов.
     */
    private readonly sectionStateService = inject(SectionStateService);

    /**
     * Пункты оглавления.
     */
    protected readonly tocSections = RULES_TOC_SECTIONS;

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
    private observer: IntersectionObserver | null = null;

    constructor() {
        afterNextRender(() => {
            // Даём параграфам вычислить свои якоря, затем открываем ссылку вида /rules#rule-5-1-1.
            setTimeout(() => this.scrollToFragment());

            if (typeof IntersectionObserver === 'undefined') {
                return;
            }

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
        this.observer?.disconnect();
    }

    /**
     * Переключает состояние всех секций.
     */
    protected toggleAll(): void {
        this.globalExpandService.toggle();
    }

    /**
     * Переход из оглавления: раскрывает раздел и прокручивает к его началу.
     *
     * @param sectionId Идентификатор раздела.
     */
    protected goToSection(sectionId: string): void {
        const wasOpen = this.sectionStateService.isSectionOpen(sectionId);
        this.sectionStateService.expandSection(sectionId);

        // Свёрнутый раздел сначала раскрывается: пока он короткий, страница может
        // не докрутиться до его начала (особенно у последних разделов).
        setTimeout(
            () => document.getElementById(`rules-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
            wasOpen ? 0 : SECTION_EXPAND_DELAY
        );
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
     * Прокручивает к пункту из адресной строки, раскрывая нужные секции.
     */
    private scrollToFragment(): void {
        const raw = window.location.hash.slice(1);
        if (!raw) {
            return;
        }

        let id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch {
            // Оставляем фрагмент как есть.
        }

        this.scrollService.scrollToElement(id);
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
