import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RuleSectionComponent } from '@app/features/rules/ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { ScrollAnchorDirective } from '@app/features/rules/directives/scroll-anchor.directive';
import { TypesAndStatusesComponent } from './components/types-and-statuses/types-and-statuses.component';
import { DefensiveStructuresComponent } from './components/defensive-structures/defensive-structures.component';

/**
 * Раздел «2. О владении наделом и организацией».
 *
 * Заголовки подразделов — в словаре `rules.i18n.ts` (`rules.content.titles`).
 */
@Component({
    selector: 'app-about-settlements',
    templateUrl: './about-settlements.component.html',
    imports: [RuleSectionComponent, ScrollAnchorDirective, TypesAndStatusesComponent, DefensiveStructuresComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSettlementsComponent extends BaseScrollableComponent {}
