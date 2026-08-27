import { ChangeDetectionStrategy, Component, computed, input, InputSignal, Signal } from '@angular/core';
import { colorToCss } from '../../lib/color-to-css.function';
import { ISettlementTag } from '../../model/i-settlement-tag';

/**
 * Бейдж тега поселения.
 *
 * Повторяет геометрию `app-settlement-badge`, но красится динамическим цветом тега.
 */
@Component({
    standalone: true,
    selector: 'app-settlement-tag',
    templateUrl: './settlement-tag.component.html',
    styleUrl: './settlement-tag.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementTagComponent {
    /**
     * Данные тега.
     */
    public readonly tag: InputSignal<ISettlementTag> = input.required<ISettlementTag>();

    /**
     * Признак отображения текста заглавными буквами.
     */
    public readonly uppercase: InputSignal<boolean> = input<boolean>(true);

    /**
     * Цвет тега как CSS-строка.
     * Прокидывается в стили через переменную `--tag-color`, а фон, текст и
     * обводка выводятся из неё в LESS — иначе три производных цвета пришлось бы
     * считать в TypeScript и они не смогли бы учитывать текущую тему.
     */
    protected readonly tagColor: Signal<string> = computed(() => colorToCss({ ...this.tag().color, alpha: 1 }));
}
