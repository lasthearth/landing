import { IShopItem } from '@entities/donate';
import { PrivilegeCard } from '../interfaces/privilege-card.interface';

/**
 * Переводит строку цены в число: нецифровые символы удаляются.
 *
 * @param price Цена из API или карточки.
 * @returns Числовое значение цены, 0 для пустой строки.
 */
function priceToNumber(price: string | undefined): number {
    return parseInt((price ?? '').replace(/\D/g, ''), 10) || 0;
}

/**
 * Сортирует карточки магазина по возрастанию цены.
 *
 * Сортирует копию массива: исходный порядок не меняется. Цена сравнивается
 * по текущему значению `monthPrice`, из строки удаляются нецифровые символы.
 *
 * @param cards Карточки привилегий или наборов.
 * @returns Новый массив карточек от самой дешёвой к самой дорогой.
 */
export function sortPrivilegeCardsByPrice(cards: PrivilegeCard[]): PrivilegeCard[] {
    return [...cards].sort((a, b) => priceToNumber(a.monthPrice) - priceToNumber(b.monthPrice));
}

/**
 * Сортирует товары магазина по возрастанию цены, которую видит игрок
 * (цена со скидкой, если она есть).
 *
 * Сортирует копию массива: исходный порядок не меняется.
 *
 * @param items Товары магазина.
 * @returns Новый массив товаров от самого дешёвого к самому дорогому.
 */
export function sortShopItemsByPrice(items: IShopItem[]): IShopItem[] {
    const current = (item: IShopItem): number => priceToNumber(item.effectivePrice || item.price);

    return [...items].sort((a, b) => current(a) - current(b));
}
