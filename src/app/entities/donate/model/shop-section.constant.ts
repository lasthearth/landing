/**
 * Раздел витрины внутри категории товара (например, «Еда» в «Особом»).
 */
export interface IShopSection {
    /**
     * Ключ раздела: так он хранится в товаре на сервере.
     */
    key: string;

    /**
     * Ключ перевода названия раздела.
     */
    labelKey: string;

    /**
     * Иконка Taiga UI.
     */
    icon: string;
}

/**
 * Разделы витрины в порядке вкладок.
 *
 * Новый раздел — одна строка здесь и перевод в `market.sections`. Товар с
 * ключом, которого нет в списке (раздел удалили), показывается только
 * во вкладке «Все».
 */
export const SHOP_SECTIONS: readonly IShopSection[] = [
    { key: 'food', labelKey: 'market.sections.food', icon: '@tui.apple' },
    { key: 'weapons', labelKey: 'market.sections.weapons', icon: '@tui.sword' },
    { key: 'armor', labelKey: 'market.sections.armor', icon: '@tui.shield' },
    { key: 'tools', labelKey: 'market.sections.tools', icon: '@tui.hammer' },
    { key: 'resources', labelKey: 'market.sections.resources', icon: '@tui.gem' },
    { key: 'healing', labelKey: 'market.sections.healing', icon: '@tui.heart-pulse' },
    { key: 'clothing', labelKey: 'market.sections.clothing', icon: '@tui.shirt' },
    { key: 'decor', labelKey: 'market.sections.decor', icon: '@tui.lamp' },
    { key: 'transport', labelKey: 'market.sections.transport', icon: '@tui.sailboat' },
    { key: 'other', labelKey: 'market.sections.other', icon: '@tui.package' },
];
