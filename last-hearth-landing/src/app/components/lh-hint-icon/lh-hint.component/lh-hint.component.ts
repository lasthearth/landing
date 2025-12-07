import { Component, input } from '@angular/core';
import { TuiHint, TuiIcon } from '@taiga-ui/core';
import { TuiTooltip } from '@taiga-ui/kit';

@Component({
    selector: 'lh-hint',
    templateUrl: './lh-hint.component.html',
    styleUrl: './lh-hint.component.css',
    imports: [TuiIcon, TuiTooltip, TuiHint],
})
export class LHHintComponent {
    alert = 'test';

    public readonly hintText = input.required<string>();
}
