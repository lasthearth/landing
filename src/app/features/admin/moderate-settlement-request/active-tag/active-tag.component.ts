import { Component, computed, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { colorToCss, ISettlementTag } from '@entities/settlement-tag';

/**
 * Интерактивный чип тега с иконкой действия (добавить/удалить).
 */
@Component({
    selector: 'app-active-tag',
    imports: [TuiIcon],
    templateUrl: './active-tag.component.html',
})
export class ActiveTagComponent {
    /**
     * Данные тега.
     */
    public tag = input.required<ISettlementTag>();

    /**
     * Режим отображения иконки.
     */
    public action: InputSignal<'add' | 'remove' | 'custom'> = input<'add' | 'remove' | 'custom'>('add');

    /**
     * Заглавные буквы текста.
     */
    public uppercase = input<boolean>(true);

    /**
     * Отключено ли взаимодействие.
     */
    public disabled = input<boolean>(false);

    /**
     * Пользовательская иконка для режима custom.
     */
    public icon = input<string>();

    /**
     * Событие клика по чипу.
     */
    public tagWasClicked: OutputEmitterRef<'add' | 'remove' | 'custom'> = output<'add' | 'remove' | 'custom'>();

    /**
     * Стиль чипа в общем дизайне проекта: фон с прозрачностью 15% + насыщенный текст.
     */
    protected readonly backgroundStyle = computed(() => {
        const color = this.tag().color;

        return {
            backgroundColor: colorToCss({ ...color, alpha: 0.15 }),
            color: colorToCss({ ...color, alpha: 1 }),
        };
    });

    /**
     * Возвращает иконку в зависимости от действия.
     *
     * @returns Имя иконки Taiga UI.
     */
    protected getIcon(): string {
        switch (this.action()) {
            case 'add':
                return '@tui.circle-plus';
            case 'remove':
                return '@tui.trash-2';
            default:
                return this.icon() ?? '';
        }
    }
}
