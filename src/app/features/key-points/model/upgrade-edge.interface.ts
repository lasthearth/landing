/**
 * Связь «требование → улучшение» на схеме, уже в координатах холста.
 *
 * Холст — `lanes × 100` на `tiers × 100` условных единиц, центр узла — `(lane·100+50, tier·100+50)`.
 */
export interface UpgradeEdge {
    /**
     * Ключ для `track`: `<откуда>-<куда>`.
     */
    readonly key: string;

    /**
     * Идентификатор узла-требования.
     */
    readonly from: string;

    /**
     * Идентификатор зависимого узла.
     */
    readonly to: string;

    /**
     * Путь SVG.
     */
    readonly path: string;

    /**
     * Связь «любой из» (развилка): рисуется пунктиром.
     */
    readonly optional: boolean;
}
