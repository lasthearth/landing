import { IShopItem } from '@entities/donate';
import { MarketSortKey, parseMarketPrice } from './market-sort-key.type';

/**
 * Текущая цена товара с учётом скидки.
 *
 * @param item Товар магазина.
 * @returns Эффективная цена, если скидка есть, иначе базовая.
 */
function effectiveItemPrice(item: IShopItem): string {
    return item.hasDiscount && item.effectivePrice ? item.effectivePrice : item.price;
}

/**
 * Сортирует товары магазина (вкладка «Особое» и результаты поиска) по ключу витрины.
 *
 * @param items Товары магазина.
 * @param key Ключ сортировки.
 * @returns Новый отсортированный массив товаров.
 */
export function sortShopItemsByKey(items: IShopItem[], key: MarketSortKey): IShopItem[] {
    const sorted = [...items];

    switch (key) {
        case 'price-desc':
            return sorted.sort((a, b) => parseMarketPrice(effectiveItemPrice(b)) - parseMarketPrice(effectiveItemPrice(a)));
        case 'discount':
            return sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
        case 'newest':
            return sorted.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        case 'price-asc':
        default:
            return sorted.sort((a, b) => parseMarketPrice(effectiveItemPrice(a)) - parseMarketPrice(effectiveItemPrice(b)));
    }
}
