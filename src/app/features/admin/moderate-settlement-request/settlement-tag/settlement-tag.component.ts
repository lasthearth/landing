import { Component, computed, input } from '@angular/core';
import { colorToCss, ISettlementTag } from '@entities/settlement-tag';

/**
 * Пассивный бейдж тега поселения.
 */
@Component({
    selector: 'app-settlement-tag',
    templateUrl: './settlement-tag.component.html',
})
export class SettlementTagComponent {
    /**
     * Данные тега.
     */
    public tag = input.required<ISettlementTag>();

    /**
     * Заглавные буквы текста.
     */
    public uppercase = input<boolean>(true);

    /**
     * Стиль бейджа в общем дизайне проекта: фон с прозрачностью 15% + насыщенный текст.
     */
    protected readonly tagStyle = computed(() => {
        const color = this.tag().color;

        return {
            backgroundColor: colorToCss({ ...color, alpha: 0.15 }),
            color: colorToCss({ ...color, alpha: 1 }),
        };
    });
}
