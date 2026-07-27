import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

@Component({
    selector: 'app-diplomacy',
    templateUrl: './diplomacy.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class DiplomacyComponent extends BaseScrollableComponent {}
