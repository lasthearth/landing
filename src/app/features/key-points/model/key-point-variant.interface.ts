import { UpgradeNode } from './upgrade-node.interface';

/**
 * Отдельная точка внутри типа со своей схемой прокачки.
 *
 * Например, три шахты: у каждой свой набор руд. Название и описание —
 * в словаре `keyPoints.points.<тип>.variants.<key>` (`name`, `description`, `nodes`).
 */
export interface KeyPointVariant {
    /**
     * Ключ точки: часть ключа словаря и значение `?variant=` в адресе.
     */
    readonly key: string;

    /**
     * Число колонок схемы.
     */
    readonly lanes: number;

    /**
     * Число рядов схемы.
     */
    readonly tiers: number;

    /**
     * Узлы схемы.
     */
    readonly nodes: readonly UpgradeNode[];
}
