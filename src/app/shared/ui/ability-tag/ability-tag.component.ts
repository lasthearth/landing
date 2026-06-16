import { Component, input, InputSignal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { IAbilityItem } from '@entities/donate';

/**
 * Компонент тега возможности / преимущества.
 *
 * Отображает иконку с подписью в виде акцентной плашки.
 */
@Component({
    selector: 'app-ability-tag',
    imports: [TuiIcon],
    templateUrl: './ability-tag.component.html',
})
export class AbilityTagComponent {
    /**
     * Данные возможности: иконка и текст.
     */
    public data: InputSignal<IAbilityItem> = input.required<IAbilityItem>();
}
