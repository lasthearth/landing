/**
 * Ключ редкости товара магазина.
 */
export type MarketRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Определяет редкость товара по его цене.
 *
 * Пороги (в коинах): от 3000 — легендарный, от 1500 — эпический,
 * от 700 — редкий, иначе — обычный.
 *
 * @param price Цена строкой (может содержать нецифровые символы).
 * @returns Ключ редкости товара.
 */
export function getRarityByPrice(price: string): MarketRarity {
    const value = parseInt((price ?? '').replace(/\D/g, ''), 10) || 0;

    if (value >= 3000) {
        return 'legendary';
    }

    if (value >= 1500) {
        return 'epic';
    }

    if (value >= 700) {
        return 'rare';
    }

    return 'common';
}
