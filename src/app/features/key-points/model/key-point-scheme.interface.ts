import { KeyPointId } from './key-point-id.type';
import { KeyPointVariant } from './key-point-variant.interface';
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
     * Узлы схемы. У типа с `variants` здесь схема первой точки — её подставляет страница.
     */
    readonly nodes: readonly UpgradeNode[];

    /**
     * Отдельные точки типа со своими схемами (например, три шахты).
     * Если заданы, страница показывает переключатель между ними.
     */
    readonly variants?: readonly KeyPointVariant[];

    /**
     * Префикс ключей словаря для текстов узлов. По умолчанию `keyPoints.points.<id>`;
     * у отдельной точки — `keyPoints.points.<id>.variants.<key>`.
     */
    readonly textKey?: string;

    /**
     * Ключ плана в планировщике. По умолчанию `id`; у отдельной точки — `<id>:<key>`,
     * чтобы у каждой шахты был свой план.
     */
    readonly planKey?: string;
}
