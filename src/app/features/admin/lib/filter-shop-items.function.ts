import { IShopItem } from '@entities/donate';
import { ShopItemsFilter } from '../model/shop-items-filter.interface';
import { matchesQuery } from './matches-query.function';

/**
 * Отбирает товары магазина по фильтрам админки.
 *
 * @param items Все товары.
 * @param filter Фильтры.
 * @returns Подходящие товары в исходном порядке.
 */
export function filterShopItems(items: readonly IShopItem[], filter: ShopItemsFilter): IShopItem[] {
    return items.filter(
        (item) =>
            (filter.category === 'all' || item.category === filter.category) &&
            (filter.status === 'all' || item.isAvailable === (filter.status === 'available')) &&
            (!filter.discountOnly || !!item.hasDiscount) &&
            matchesQuery(filter.query, [item.name, item.code, item.section])
    );
}
