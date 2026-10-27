import { Component, input, InputSignal } from '@angular/core';
import { TuiHint } from '@taiga-ui/core';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { KitItem } from '../../interfaces/kit-item.interface';

/**
 * Компонент ячейки предмета набора в стиле игрового инвентаря.
 *
 * Отображает иконку предмета с количеством в углу.
 * При наведении увеличивается, подсвечивается акцентным цветом и показывает
 * подсказку сайта с названием и описанием предмета.
 */
@Component({
    selector: 'app-kit-item',
    imports: [ImageLoaderComponent, TuiHint],
    templateUrl: './kit-item.component.html',
})
export class KitItemComponent {
    /**
     * Данные предмета.
     */
    public data: InputSignal<KitItem> = input.required();
}
