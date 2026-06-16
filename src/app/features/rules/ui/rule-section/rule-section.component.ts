import { ChangeDetectionStrategy, Component, input, output, computed, inject, Provider, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { TuiExpand } from '@taiga-ui/experimental';
import { TuiPulse } from '@taiga-ui/kit';
import { BaseExpandableSection } from '../../abstracts/base-expandable-section';
import { SECTION_ID } from '../../tokens/section-id.token';

/**
 * Секция, которая провайдит свой ID через токен SECTION_ID.
 */
export const SECTION_ID_PROVIDER: Provider = {
    provide: SECTION_ID,
    useFactory: () => inject(RuleSectionComponent).sectionIdSignal,
};

/**
 * Единый компонент секции правил.
 */
@Component({
    selector: 'app-rule-section',
    standalone: true,
    imports: [CommonModule, TuiIcon, TuiExpand, TuiPulse],
    templateUrl: './rule-section.component.html',
    styleUrls: ['../../styles/rules.less'],
    providers: [SECTION_ID_PROVIDER],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleSectionComponent extends BaseExpandableSection {
    /**
     * Сигнал ID секции для передачи через DI.
     */
    public readonly sectionIdSignal: Signal<string> = computed(() => this.sectionId());

    /**
     * Уникальный идентификатор секции.
     */
    public override sectionId = input.required<string>();

    /**
     * Заголовок секции.
     */
    public override title = input.required<string>();

    /**
     * Иконка из Taiga UI.
     */
    public override icon = input<string>();

    /**
     * Событие прокрутки к элементу (опционально).
     */
    public scrollTo = output<string>();

    /**
     * ID родительской секции (для иерархии).
     */
    public override parentId = input<string>();

    /**
     * Уровень вложенности (для отступа и стилизации).
     * 0 - основная секция, 1+ - подсекция.
     */
    public level = input(0);

    /**
     * Возвращает CSS класс отступа по уровню вложенности.
     */
    protected readonly indentClass = computed(() => {
        const level = this.level();
        const classes = [
            '', // level 0 - без отступа
            'pl-8', // level 1 - 2rem
            'pl-16', // level 2 - 4rem
            'pl-20', // level 3 - 5rem
            'pl-24', // level 4 - 6rem
        ];
        return classes[level] || '';
    });

    /**
     * Возвращает CSS класс для заголовка в зависимости от уровня.
     */
    protected readonly titleClass = computed(() => {
        return this.level() === 0
            ? 'text-xl md:text-2xl lg:text-[32px] font-bold leading-tight'
            : 'text-lg md:text-xl lg:text-[26px] font-bold leading-tight';
    });

    /**
     * Возвращает CSS класс для контента в зависимости от уровня.
     */
    protected readonly contentClass = computed(() => {
        return this.level() === 0 ? 'rule-content' : 'flex flex-col gap-3';
    });

    /**
     * Возвращает true, если нужен отступ сверху (для подсекций уровня 2+).
     */
    protected readonly needsMarginTop = computed(() => this.level() > 1);

    /**
     * Обрабатывает запрос на прокрутку к элементу.
     */
    protected onScrollTo(elementId: string): void {
        this.scrollTo.emit(elementId);
    }
}
