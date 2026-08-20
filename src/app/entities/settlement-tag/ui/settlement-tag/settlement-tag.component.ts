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
     * Стиль бейджа в общем дизайне проекта: фон с прозрачностью 15% + насыщенный текст.
     */
    protected readonly tagStyle: Signal<Record<string, string>> = computed(() => {
        const color = this.tag().color;

        return {
            backgroundColor: colorToCss({ ...color, alpha: 0.15 }),
            color: colorToCss({ ...color, alpha: 1 }),
        };
    });

    /**
     * Итоговый набор CSS-классов бейджа.
     */
    protected readonly classes: Signal<string> = computed(
        () =>
            'inline-flex items-center gap-1 font-bold text-base px-2 py-0.5 rounded-lg ' +
            (this.uppercase() ? 'uppercase' : '')
    );
}
