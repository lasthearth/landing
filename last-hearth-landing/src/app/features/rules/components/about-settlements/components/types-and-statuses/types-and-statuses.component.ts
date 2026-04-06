import { Component } from '@angular/core';
import { RuleSectionComponent } from '@app/features/rules/ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { HomesteadComponent } from './components/homestead/homestead.component';
import { CampComponent } from './components/camp/camp.component';
import { VillageComponent } from './components/village/village.component';
import { TownshipComponent } from './components/township/township.component';
import { CityComponent } from './components/city/city.component';
import { RegionComponent } from './components/region/region.component';
import { SuzerainComponent } from './components/suzerain/suzerain.component';

/**
 * Компонент типов и статусов поселений.
 */
@Component({
    selector: 'app-types-and-statuses',
    templateUrl: './types-and-statuses.component.html',
    imports: [RuleSectionComponent, HomesteadComponent, CampComponent, VillageComponent, TownshipComponent, CityComponent, RegionComponent, SuzerainComponent],
})
export class TypesAndStatusesComponent extends BaseScrollableComponent {}
