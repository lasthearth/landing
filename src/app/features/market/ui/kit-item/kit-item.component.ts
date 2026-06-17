import { Component, input, InputSignal } from '@angular/core';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { KitItem } from '../../interfaces/kit-item.interface';

/**
 * Компонент ячейки предмета набора в стиле игрового инвентаря.
 *
 * Отображает иконку предмета с количеством в углу.
 * При наведении увеличивается и подсвечивается акцентным цветом.
 */
@Component({
    selector: 'app-kit-item',
    imports: [ImageLoaderComponent],
    templateUrl: './kit-item.component.html',
})
export class KitItemComponent {
    /**
     * Данные предмета.
     */
    public data: InputSignal<KitItem> = input.required();
}
