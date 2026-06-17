import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Компонент пустого состояния.
 *
 * Отображает иконку, заголовок и описание, когда данных нет
 * или раздел ещё не заполнен.
 */
@Component({
    selector: 'app-empty-state',
    standalone: true,
    imports: [TuiIcon],
    templateUrl: './empty-state.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
    /**
     * Иконка Taiga UI.
     */
    public icon: InputSignal<string> = input<string>('@tui.package-open');

    /**
     * Заголовок пустого состояния.
     */
    public title: InputSignal<string> = input.required<string>();

    /**
     * Дополнительное описание.
     */
    public description: InputSignal<string> = input<string>('');
}
