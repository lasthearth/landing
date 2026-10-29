import { IShopItem } from '@entities/donate';
import { ShopSort } from '../model/shop-sort.type';

/**
 * Сортирует товары магазина для списка в админке.
 *
 * Цена приходит строкой (decimal) — для сравнения переводится в число,
 * в самих данных остаётся строкой. Берётся цена со скидкой, если она есть.
 *
 * @param items Товары.
 * @param sort Порядок.
 * @returns Новый отсортированный массив.
 */
export function sortShopItems(items: readonly IShopItem[], sort: ShopSort): IShopItem[] {
    const price = (item: IShopItem): number => Number(item.effectivePrice || item.price) || 0;
    const time = (item: IShopItem): number => (item.updatedAt ?? item.createdAt)?.getTime() ?? 0;

    return [...items].sort((a, b) => {
        switch (sort) {
            case 'name':
                return a.name.localeCompare(b.name, 'ru');
            case 'price':
                return price(a) - price(b);
            case 'updated':
            default:
                return time(b) - time(a);
        }
    });
}
