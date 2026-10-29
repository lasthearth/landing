import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { buildSchemeEdges } from '../../lib/build-scheme-edges.function';
import { collectAncestors } from '../../lib/collect-ancestors.function';
import { collectDescendants } from '../../lib/collect-descendants.function';
import { getNodeState } from '../../lib/get-node-state.function';
import { formatCost } from '../../lib/format-cost.function';
import { sumCosts } from '../../lib/sum-costs.function';
import { textKeyOf } from '../../lib/text-key-of.function';
import { KeyPointPlannerStore } from '../../model/key-point-planner.store';
import { KeyPointScheme } from '../../model/key-point-scheme.interface';
import { UpgradeCost } from '../../model/upgrade-cost.interface';
import { UpgradeNode } from '../../model/upgrade-node.interface';
import { UpgradeNodeState } from '../../model/upgrade-node-state.type';
import { UpgradeNodeDetailsComponent } from '../upgrade-node-details/upgrade-node-details.component';

/**
 * Римские номера уровней точки: у медальона уровня — бейдж с номером.
 */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/**
 * Узел, подготовленный к выводу на холсте.
 */
interface SchemeNodeView {
    /**
     * Узел схемы.
     */
    readonly node: UpgradeNode;

    /**
     * Состояние в плане.
     */
    readonly state: UpgradeNodeState;

    /**
     * Позиция центра медальона по горизонтали, % ширины холста.
     */
    readonly x: number;

    /**
     * Позиция центра медальона по вертикали, % высоты холста.
     */
    readonly y: number;

    /**
     * Номер уровня (только у узлов-уровней).
     */
    readonly levelNumber: string | null;

    /**
     * Лежит на пути выделенного узла (предок, потомок или он сам).
     */
    readonly related: boolean;

    /**
     * Цена под подписью: первая строка стоимости (у большинства узлов она одна).
     */
    readonly price: UpgradeCost | null;

    /**
     * Сколько ещё строк стоимости не поместилось под подпись.
     */
    readonly morePrices: number;
}

/**
 * Подсказка над узлом под курсором или в фокусе.
 */
interface SchemeTip {
    /**
     * Узел с состоянием.
     */
    readonly view: SchemeNodeView;

    /**
     * Показать под узлом, а не над ним (верхний ряд — сверху нет места).
     */
    readonly below: boolean;

    /**
     * Прижать к краю: узел в крайней колонке, по центру подсказка вылезла бы за холст.
     */
    readonly align: 'start' | 'center' | 'end';
}

/**
 * Пометка «или» между специализациями одной группы выбора.
 */
interface ChoiceMark {
    /**
     * Ключ для `track`.
     */
    readonly key: string;

    /**
     * Позиция по горизонтали, % ширины холста.
     */
    readonly x: number;

    /**
     * Позиция по вертикали, % высоты холста.
     */
    readonly y: number;
}

/**
 * Интерактивная схема прокачки одной ключевой точки.
 *
 * Узлы стоят в сетке «ряд × колонка», связи рисуются SVG поверх той же сетки.
 * Наведение или фокус подсвечивают путь узла: что нужно до него и что он открывает.
 * Клик выбирает узел и показывает подробности сбоку; там же узел отмечается
 * построенным — так игрок проверяет, какой путь ему по карману.
 */
@Component({
    selector: 'app-upgrade-scheme',
    imports: [TranslatePipe, TuiIcon, UpgradeNodeDetailsComponent],
    templateUrl: './upgrade-scheme.component.html',
    styleUrl: './upgrade-scheme.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradeSchemeComponent {
    private readonly planner = inject(KeyPointPlannerStore);
    private readonly i18n = inject(I18nService);

    /**
     * Схема точки.
     */
    public readonly scheme = input.required<KeyPointScheme>();

    /**
     * Выбранный узел. При смене точки выбирается её первый узел.
     */
    protected readonly selectedId = linkedSignal(() => this.scheme().nodes[0]?.id ?? null);

    /**
     * Префикс ключей словаря для текстов узлов.
     */
    protected readonly textKey = computed(() => textKeyOf(this.scheme()));

    /**
     * Узел под курсором или в фокусе клавиатуры.
     */
    protected readonly hoveredId = signal<string | null>(null);

    /**
     * Узел, путь которого подсвечивается: наведённый важнее выбранного.
     */
    private readonly focusId = computed(() => this.hoveredId() ?? this.selectedId());

    /**
     * Построенные узлы точки.
     */
    protected readonly built = computed(() => this.planner.builtOf(this.scheme()));

    /**
     * Узлы на пути подсвеченного узла, включая его самого.
     */
    private readonly related = computed<ReadonlySet<string>>(() => {
        const id = this.focusId();
        if (!id) {
            return new Set<string>();
        }

        const scheme = this.scheme();
        return new Set([id, ...collectAncestors(scheme, id), ...collectDescendants(scheme, id)]);
    });

    /**
     * Узлы для вывода на холсте.
     */
    protected readonly nodes = computed<readonly SchemeNodeView[]>(() => {
        const scheme = this.scheme();
        const built = this.built();
        const related = this.related();
        let level = 0;

        return scheme.nodes.map((node) => ({
            node,
            state: getNodeState(scheme, node, built),
            x: ((node.lane + 0.5) / scheme.lanes) * 100,
            y: ((node.tier + 0.5) / scheme.tiers) * 100,
            levelNumber: node.kind === 'level' ? (ROMAN[level++] ?? null) : null,
            related: related.has(node.id),
            price: node.cost[0] ?? null,
            morePrices: Math.max(node.cost.length - 1, 0),
        }));
    });

    /**
     * Связи схемы с признаками подсветки.
     */
    protected readonly edges = computed(() => {
        const built = this.built();
        const related = this.related();

        return buildSchemeEdges(this.scheme()).map((edge) => ({
            ...edge,
            built: built.has(edge.from) && built.has(edge.to),
            related: related.has(edge.from) && related.has(edge.to),
        }));
    });

    /**
     * Размер холста в условных единицах — для `viewBox`.
     */
    protected readonly viewBox = computed(() => `0 0 ${this.scheme().lanes * 100} ${this.scheme().tiers * 100}`);

    /**
     * Пометки «или» между соседними специализациями одной группы.
     */
    protected readonly choiceMarks = computed<readonly ChoiceMark[]>(() => {
        const scheme = this.scheme();
        const marks: ChoiceMark[] = [];

        for (const node of scheme.nodes) {
            // Ближайший справа узел той же группы в том же ряду.
            const neighbour = scheme.nodes
                .filter(
                    (other) =>
                        other.choiceGroup !== undefined &&
                        other.choiceGroup === node.choiceGroup &&
                        other.tier === node.tier &&
                        other.lane > node.lane
                )
                .sort((a, b) => a.lane - b.lane)[0];
            if (!neighbour) {
                continue;
            }

            const between = scheme.nodes.find(
                (other) => other.tier === node.tier && other.lane > node.lane && other.lane < neighbour.lane
            );
            const y = ((node.tier + 0.5) / scheme.tiers) * 100;

            if (between) {
                // Посередине стоит другой узел (итог выбора): «или» ставится на обе
                // связи к нему, получается «вариант — или — итог — или — вариант».
                marks.push(
                    {
                        key: `${node.id}-${between.id}`,
                        x: ((node.lane + between.lane + 1) / 2 / scheme.lanes) * 100,
                        y,
                    },
                    {
                        key: `${between.id}-${neighbour.id}`,
                        x: ((between.lane + neighbour.lane + 1) / 2 / scheme.lanes) * 100,
                        y,
                    }
                );
            } else {
                marks.push({
                    key: `${node.id}-${neighbour.id}`,
                    x: ((node.lane + neighbour.lane + 1) / 2 / scheme.lanes) * 100,
                    y,
                });
            }
        }

        return marks;
    });

    /**
     * Подсказка для узла под курсором или в фокусе: что даёт, сколько стоит, в каком состоянии.
     */
    protected readonly tip = computed<SchemeTip | null>(() => {
        const id = this.hoveredId();
        const view = id ? this.nodes().find((item) => item.node.id === id) : undefined;
        if (!view) {
            return null;
        }

        const lanes = this.scheme().lanes;
        const align =
            lanes > 1 && view.node.lane === 0 ? 'start' : view.node.lane === lanes - 1 && lanes > 1 ? 'end' : 'center';

        return { view, below: view.node.tier === 0, align };
    });

    /**
     * Выбранный узел с состоянием — для панели подробностей.
     */
    protected readonly selected = computed(
        () => this.nodes().find((view) => view.node.id === this.selectedId()) ?? null
    );

    /**
     * Сколько узлов отмечено построенными.
     */
    protected readonly builtCount = computed(() => this.built().size);

    /**
     * Суммарная стоимость отмеченных узлов.
     */
    protected readonly planCost = computed(() =>
        sumCosts(this.scheme().nodes.filter((node) => this.built().has(node.id)))
    );

    /**
     * Стоимость текстом: «1 дукат 10 серебряных» или кратко «1 зол. 10 сер.».
     *
     * @param cost Строка стоимости.
     * @param short Краткая форма — для бирки под узлом.
     * @returns Текст стоимости.
     */
    protected costText(cost: UpgradeCost, short = false): string {
        return formatCost(cost, this.i18n.language(), (key) => this.i18n.translate(key), short);
    }

    /**
     * Есть ли подсвеченный путь: остальные узлы и линии тогда приглушаются.
     */
    protected readonly hasFocus = computed(() => this.focusId() !== null);

    /**
     * Выбирает узел.
     *
     * @param id Идентификатор узла.
     */
    protected select(id: string): void {
        this.selectedId.set(id);
    }

    /**
     * Отмечает выбранный узел построенным или снимает отметку.
     */
    protected toggleSelected(): void {
        const view = this.selected();
        if (view) {
            this.planner.toggle(this.scheme(), view.node);
        }
    }

    /**
     * Сбрасывает план точки.
     */
    protected reset(): void {
        this.planner.reset(this.scheme());
    }
}
