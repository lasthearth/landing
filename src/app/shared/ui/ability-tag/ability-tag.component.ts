import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { IAbilityItem } from '@entities/donate';

/**
 * Компонент тега возможности / преимущества.
 *
 * Отображает иконку с подписью в виде акцентной плашки.
 */
@Component({
    selector: 'app-ability-tag',
    standalone: true,
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './ability-tag.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbilityTagComponent {
    /**
     * Данные возможности: иконка и текст.
     */
    public data: InputSignal<IAbilityItem> = input.required<IAbilityItem>();
}
