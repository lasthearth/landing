/**
 * Ключ сортировки витрины магазина.
 *
 * Только ключи, по которым есть реальные данные в товаре:
 * цена, скидка и дата создания. «Популярность» не добавляем,
 * пока бэкенд не отдаёт счётчик продаж публично.
 */
export type MarketSortKey = 'price-asc' | 'price-desc' | 'discount' | 'newest';

/**
 * Порядок кнопок сортировки и их подписи в словаре `market.sort`.
 */
export const MARKET_SORT_OPTIONS: readonly { key: MarketSortKey; labelKey: string }[] = [
    { key: 'price-asc', labelKey: 'market.sort.priceAsc' },
    { key: 'price-desc', labelKey: 'market.sort.priceDesc' },
    { key: 'discount', labelKey: 'market.sort.discount' },
    { key: 'newest', labelKey: 'market.sort.newest' },
];

/**
 * Приводит строку цены к числу: нецифровые символы отбрасываются.
 *
 * @param price Строка цены из API.
 * @returns Числовое значение цены, 0 для пустой строки.
 */
export function parseMarketPrice(price: string): number {
    return Number(price.replace(/\D/g, '')) || 0;
}
