import { UpgradeCost } from './upgrade-cost.interface';
import { UpgradeNodeKind } from './upgrade-node-kind.type';

/**
 * Узел схемы прокачки ключевой точки.
 *
 * Тексты узла лежат в словаре: `keyPoints.points.<точка>.nodes.<id>.title` и `.effect`.
 */
export interface UpgradeNode {
    /**
     * Идентификатор, уникальный в пределах точки. Он же ключ словаря.
     */
    readonly id: string;

    /**
     * Вид узла.
     */
    readonly kind: UpgradeNodeKind;

    /**
     * Ряд схемы сверху вниз, с нуля.
     */
    readonly tier: number;

    /**
     * Колонка схемы слева направо, с нуля.
     */
    readonly lane: number;

    /**
     * Иконка Taiga UI (`@tui.*`).
     */
    readonly icon: string;

    /**
     * Узлы, которые должны быть построены все.
     */
    readonly requires: readonly string[];

    /**
     * Узлы, из которых достаточно любого одного (развилка специализаций).
     */
    readonly requiresAny?: readonly string[];

    /**
     * Группа взаимоисключающего выбора: из узлов с одной группой строится только один.
     */
    readonly choiceGroup?: string;

    /**
     * Узел открывается сам, как только выполнены требования, и отдельно не строится.
     * Например, «3 торговца» на торговой точке — итог найма торговца, а не покупка.
     */
    readonly automatic?: boolean;

    /**
     * Стоимость. Пустая — узел отдельно не оплачивается.
     */
    readonly cost: readonly UpgradeCost[];
}
