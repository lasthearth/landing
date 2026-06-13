import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScrollAnchorDirective } from '../../directives/scroll-anchor.directive';

/**
 * Компонент параграфа правила.
 */
@Component({
    selector: 'app-rule-paragraph',
    standalone: true,
    imports: [ScrollAnchorDirective],
    templateUrl: './rule-paragraph.component.html',
    styleUrl: '../../styles/rules.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleParagraphComponent {
    /**
     * Идентификатор якоря для прокрутки.
     *
     * Если указан, на этот элемент можно выполнить прокрутку.
     */
    public readonly anchor = input<string>();

    /**
     * Дополнительные CSS классы.
     */
    public readonly customClass = input<string>('');

    /**
     * Уровень вложенности (для отступа).
     *
     * 0 - без отступа
     * 1 - 2rem
     * 2 - 4rem
     * 3 - 5rem
     * 4 - 6rem
     */
    public readonly level = input<number>(0);

    /**
     * Возвращает CSS класс отступа по уровню вложенности.
     */
    protected readonly indentClass = computed(() => {
        const level = this.level();
        const classes = [
            '', // level 0 - без отступа
            'pl-6!', // level 1 - 1.5rem
            'pl-10!', // level 2 - 2.5rem
            'pl-14!', // level 3 - 3.5rem
            'pl-16!', // level 4 - 4rem
            'pl-20!', // level 5 - 5rem
        ];
        return classes[level] || '';
    });

    /**
     * Возвращает CSS классы параграфа.
     */
    protected readonly paragraphClasses = computed(() => {
        const classes = ['rule-paragraph'];

        const indent = this.indentClass();
        if (indent) {
            classes.push(indent);
        }

        const customClass = this.customClass();
        if (customClass) {
            classes.push(customClass);
        }

        return classes.join(' ');
    });
}
