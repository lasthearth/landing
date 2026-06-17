import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

@Component({
    selector: 'app-special-interactions',
    imports: [RuleParagraphComponent, TranslatePipe],
    templateUrl: './special-interactions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialInteractionComponent extends BaseScrollableComponent {}
