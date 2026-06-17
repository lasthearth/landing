import { ChangeDetectionStrategy, Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

/**
 * Компонент состояния ошибки загрузки.
 *
 * Показывает понятное сообщение об ошибке и кнопку для повторной попытки.
 */
@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [TuiIcon, TuiButton],
    templateUrl: './error-state.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
    /**
     * Заголовок ошибки.
     */
    public title: InputSignal<string> = input<string>('Не удалось загрузить данные');

    /**
     * Описание ошибки.
     */
    public description: InputSignal<string> = input<string>('Проверьте подключение к интернету и попробуйте снова.');

    /**
     * Текст кнопки повтора.
     */
    public retryText: InputSignal<string> = input<string>('Повторить');

    /**
     * Событие нажатия на кнопку повтора.
     */
    public retry = output<void>();
}
