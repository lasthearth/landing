import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';

/**
 * Компонент карточки привилегии.
 */
@Component({
    selector: 'app-privilege-card',
    imports: [],
    templateUrl: './privilege-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivilegeCardComponent {
    /**
     * Название привилегии.
     */
    public title: InputSignal<string> = input.required<string>();

    /**
     * Картинка привилегии.
     */
    public image: InputSignal<string> = input.required<string>();

    /**
     * Стоимость привилегии.
     */
    public price: InputSignal<string> = input.required<string>();

    public selected = input<boolean>(false);
}
