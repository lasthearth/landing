import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiHint, TuiIcon } from '@taiga-ui/core';
import { TuiTooltip } from '@taiga-ui/kit';

/*
 * Компонент подсказок сайта
 */
@Component({
    selector: 'lh-hint',
    templateUrl: './lh-hint.component.html',
    imports: [TuiIcon, TuiTooltip, TuiHint],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LHHintComponent {
    /**
     * Текст подсказки
     */
    public readonly hintText = input.required<string>();
}
