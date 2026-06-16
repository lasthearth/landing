import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

@Component({
    selector: 'app-saboteurs',
    imports: [RuleParagraphComponent],
    templateUrl: './saboteurs.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaboteursComponent extends BaseScrollableComponent {}
