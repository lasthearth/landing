import { Component } from '@angular/core';
import { RaidComponent } from './components/raid/raid.component';
import { WarComponent } from './components/war/war.component';
import { OccupyPointsComponent } from './components/occupypoints/occupy-points.component';
import { RuleSectionComponent } from '../../ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '../../abstracts/base-scrollable.component';

@Component({
    selector: 'app-military-actions',
    templateUrl: './military-actions.component.html',
    imports: [RaidComponent, WarComponent, OccupyPointsComponent, RuleSectionComponent],
})
export class MilitaryActionsComponent extends BaseScrollableComponent {}
