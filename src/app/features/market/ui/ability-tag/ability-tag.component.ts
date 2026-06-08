import { Component, input, InputSignal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { abilityItem } from '../../interfaces/ability-item.interface';

@Component({
    selector: 'app-ability-tag',
    imports: [TuiIcon],
    templateUrl: './ability-tag.component.html',
})
export class AbilityTagComponent {
    public data: InputSignal<abilityItem> = input.required();
}
