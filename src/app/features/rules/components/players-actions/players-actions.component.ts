import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RuleSectionComponent } from '@app/features/rules/ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { ScrollAnchorDirective } from '@app/features/rules/directives/scroll-anchor.directive';
import { TheftComponent } from './components/theft/theft.component';
import { KillsComponent } from './components/kills/kills.component';
import { EspionageComponent } from './components/espionage/espionage.component';
import { RobberyComponent } from './components/robbery/robbery.component';
import { DiplomacyComponent } from './components/diplomacy/diplomacy.component';
import { SpecialInteractionComponent } from './components/special-interactions/special-interactions.component';
import { SaboteursComponent } from './components/saboteurs/saboteurs.component';

/**
 * Раздел «3. Действия игроков».
 *
 * Заголовки подразделов — в словаре `rules.i18n.ts` (`rules.content.titles`).
 */
@Component({
    selector: 'app-players-actions',
    templateUrl: './players-actions.component.html',
    imports: [
        RuleSectionComponent,
        ScrollAnchorDirective,
        TheftComponent,
        KillsComponent,
        EspionageComponent,
        RobberyComponent,
        DiplomacyComponent,
        SpecialInteractionComponent,
        SaboteursComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersActionsComponent extends BaseScrollableComponent {}
