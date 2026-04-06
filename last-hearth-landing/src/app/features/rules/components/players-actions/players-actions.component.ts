import { Component } from '@angular/core';
import { TheftComponent } from './components/theft/theft.component';
import { KillsComponent } from './components/kills/kills.component';
import { EspionageComponent } from './components/espionage/espionage.component';
import { DiplomacyComponent } from './components/diplomacy/diplomacy.component';
import { RuleSectionComponent } from '../../ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '../../abstracts/base-scrollable.component';

@Component({
    selector: 'app-players-actions',
    templateUrl: './players-actions.component.html',
    imports: [TheftComponent, KillsComponent, EspionageComponent, DiplomacyComponent, RuleSectionComponent],
})
export class PlayersActionsComponent extends BaseScrollableComponent {}
