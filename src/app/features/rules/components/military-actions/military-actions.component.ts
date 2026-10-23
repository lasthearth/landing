import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RuleSectionComponent } from '@app/features/rules/ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { ScrollAnchorDirective } from '@app/features/rules/directives/scroll-anchor.directive';
import { RaidComponent } from './components/raid/raid.component';
import { WarComponent } from './components/war/war.component';
import { OccupyPointsComponent } from './components/occupypoints/occupy-points.component';

/**
 * Раздел «6. Военные действия».
 *
 * Заголовки подразделов — в словаре `rules.i18n.ts` (`rules.content.titles`).
 */
@Component({
    selector: 'app-military-actions',
    templateUrl: './military-actions.component.html',
    imports: [RuleSectionComponent, ScrollAnchorDirective, RaidComponent, WarComponent, OccupyPointsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilitaryActionsComponent extends BaseScrollableComponent {}
