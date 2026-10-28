import { KeyPointId } from './key-point-id.type';
import { UpgradeNode } from './upgrade-node.interface';

/**
 * Схема прокачки одного типа ключевой точки.
 */
export interface KeyPointScheme {
    /**
     * Тип точки.
     */
    readonly id: KeyPointId;

    /**
     * Иконка точки (`@tui.*`).
     */
    readonly icon: string;

    /**
     * CSS-переменная акцентного цвета точки, например `var(--lh-rank-iron)`.
     * Красит только декор (кольца, линии), текст всегда на `*-ink` токенах.
     */
    readonly accent: string;

    /**
     * Число колонок схемы.
     */
    readonly lanes: number;

    /**
     * Число рядов схемы.
     */
    readonly tiers: number;

    /**
     * Схема ещё не утверждена: на странице показывается пометка «предварительно».
     */
    readonly draft: boolean;

    /**
     * Узлы схемы.
     */
    readonly nodes: readonly UpgradeNode[];
}
