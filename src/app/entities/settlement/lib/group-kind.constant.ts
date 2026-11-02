/**
 * Род группы игроков (`GroupKind` из REST-контракта).
 *
 * Надел и гильдия лежат в одной коллекции, но это разные роды: `GET /settlements`
 * без `kind` отдаёт только наделы, каталог гильдий — с `kind=GROUP_KIND_GUILD`.
 * Один игрок может состоять в одном наделе и в одной гильдии одновременно.
 */
export const GROUP_KIND = {
    /**
     * Надел: место на карте земель.
     */
    settlement: 'GROUP_KIND_SETTLEMENT',

    /**
     * Гильдия: места на карте не занимает.
     */
    guild: 'GROUP_KIND_GUILD',
} as const;

/**
 * Род группы из `GROUP_KIND`.
 */
export type GroupKind = (typeof GROUP_KIND)[keyof typeof GROUP_KIND];
