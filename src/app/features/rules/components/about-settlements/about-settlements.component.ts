import { Component } from '@angular/core';
import { TypesAndStatusesComponent } from './components/types-and-statuses/types-and-statuses.component';
import { DefensiveStructuresComponent } from './components/defensive-structures/defensive-structures.component';
import { RuleSectionComponent } from '../../ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '../../abstracts/base-scrollable.component';

/**
 * Компонент о поселениях и их типах.
 */
@Component({
    selector: 'app-about-settlements',
    templateUrl: './about-settlements.component.html',
    imports: [TypesAndStatusesComponent, DefensiveStructuresComponent, RuleSectionComponent],
})
export class AboutSettlementsComponent extends BaseScrollableComponent {}
