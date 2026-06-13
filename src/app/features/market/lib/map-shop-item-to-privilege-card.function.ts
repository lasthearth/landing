import { IShopItem } from '@entities/donate';
import { PrivilegeCard } from '../interfaces/privilege-card.interface';

/**
 * Преобразует товар магазина из API в модель карточки привилегии.
 *
 * @param item Товар магазина.
 * @returns Карточка привилегии для отображения во вкладках «Привилегии» и «Наборы».
 */
export function mapShopItemToPrivilegeCard(item: IShopItem): PrivilegeCard {
    const currentPrice = item.effectivePrice && item.effectivePrice !== item.price ? item.effectivePrice : item.price;
    const originalPrice = item.hasDiscount && item.effectivePrice ? item.price : '';

    return {
        id: item.id,
        title: item.name,
        description: item.description,
        image: item.imageUrl,
        monthPrice: currentPrice,
        monthPriceOriginal: originalPrice,
        seasonPrice: '',
        seasonPriceOriginal: '',
        kitItems: (item.entries ?? []).map((entry) => ({
            hint: entry.name,
            count: entry.quantity,
            image: entry.imageUrl,
        })),
        dailyKitItems: [],
        abilities: [],
        currency: 'coins',
    };
}
