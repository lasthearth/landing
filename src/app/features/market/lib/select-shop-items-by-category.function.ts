import { IShopItem, ShopCategory } from '@entities/donate';

/**
 * Отбирает товары магазина одной категории, доступные для покупки.
 *
 * Категория приходит с бэкенда в поле `category` и нормализуется в слое
 * сущностей: пустое или неизвестное значение становится `kit`.
 *
 * @param items Список товаров магазина.
 * @param category Нужная категория.
 * @returns Доступные товары этой категории в порядке выдачи API.
 */
export function selectShopItemsByCategory(items: IShopItem[], category: ShopCategory): IShopItem[] {
    return items.filter((item) => item.isAvailable && item.category === category);
}
