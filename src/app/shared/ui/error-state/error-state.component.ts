import { ChangeDetectionStrategy, Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Компонент состояния ошибки загрузки.
 *
 * Показывает понятное сообщение об ошибке и кнопку для повторной попытки.
 */
@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [TuiIcon, TuiButton, TranslatePipe],
    templateUrl: './error-state.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
    /**
     * Заголовок ошибки.
     */
    public title: InputSignal<string> = input<string>('shared.errorState.title');

    /**
     * Описание ошибки.
     */
    public description: InputSignal<string> = input<string>('shared.errorState.description');

    /**
     * Текст кнопки повтора.
     */
    public retryText: InputSignal<string> = input<string>('shared.errorState.retry');

    /**
     * Событие нажатия на кнопку повтора.
     */
    public retry = output<void>();
}
