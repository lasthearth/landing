import { PrivilegeCard } from '../interfaces/privilege-card.interface';
import { MarketSortKey, parseMarketPrice } from './market-sort-key.type';

/**
 * Сортирует карточки привилегий и наборов по ключу витрины.
 *
 * Копию списка не делает: возвращает новый массив, входной не мутирует.
 * Скидка важнее даты: товар со скидкой поднимаем выше независимо от возраста.
 *
 * @param cards Карточки витрины.
 * @param key Ключ сортировки.
 * @returns Новый отсортированный массив карточек.
 */
export function sortPrivilegeCardsByKey(cards: PrivilegeCard[], key: MarketSortKey): PrivilegeCard[] {
    const sorted = [...cards];

    switch (key) {
        case 'price-desc':
            return sorted.sort((a, b) => parseMarketPrice(b.monthPrice) - parseMarketPrice(a.monthPrice));
        case 'discount':
            return sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
        case 'newest':
            return sorted.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        case 'price-asc':
        default:
            return sorted.sort((a, b) => parseMarketPrice(a.monthPrice) - parseMarketPrice(b.monthPrice));
    }
}
