import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Поле поиска для списков: иконка лупы, ввод и кнопка очистки.
 *
 * Значение хранит владелец (`value` + `valueChange`), поле только показывает его:
 * так фильтр живёт в сигнале страницы и сбрасывается вместе с остальными фильтрами.
 */
@Component({
    selector: 'app-search-field',
    imports: [TuiIcon],
    templateUrl: './search-field.component.html',
    styleUrl: './search-field.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFieldComponent {
    /**
     * Текущий текст поиска.
     */
    public readonly value = input<string>('');

    /**
     * Подсказка в пустом поле (уже переведённая).
     */
    public readonly placeholder = input<string>('');

    /**
     * Подпись для скринридера (уже переведённая).
     */
    public readonly label = input.required<string>();

    /**
     * Подпись кнопки очистки (уже переведённая).
     */
    public readonly clearLabel = input<string>('×');

    /**
     * Новый текст поиска.
     */
    public readonly valueChange = output<string>();

    /**
     * Передаёт введённый текст владельцу.
     *
     * @param event Событие ввода.
     */
    protected onInput(event: Event): void {
        this.valueChange.emit((event.target as HTMLInputElement).value);
    }
}
