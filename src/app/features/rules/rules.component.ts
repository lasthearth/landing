import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class RulesComponent {
    /**
     * Сервис прокрутки.
     */
    private readonly scrollService: ScrollService = inject(ScrollService);

    /**
     * Сервис глобального управления раскрытием всех секций.
     */
    protected readonly globalExpandService = inject(GlobalExpandService);

    /**
     * Переключает состояние всех секций.
     */
    protected toggleAll(): void {
        this.globalExpandService.toggle();
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
