import { KitItem } from './kit-item.interface';

/**
 * Модель данных карточки привилегии.
 */
export interface PrivilegeCard {
    /**
     * Название привилегии.
     */
    title: string;

    /**
     * Изображение привилегии.
     */
    image: string;

    /**
     * Стоимость привилегии за 1 месяц.
     */
    monthPrice: string;

    /**
     * Оригинальная стоимость за 1 месяц (до скидки) для зачёркивания.
     */
    monthPriceOriginal: string;

    /**
     * Стоимость привилегии за весь сезон.
     */
    seasonPrice: string;

    /**
     * Оригинальная стоимость за сезон (до скидки) для зачёркивания.
     */
    seasonPriceOriginal: string;

    /**
     * Преимущества привилегии.
     */
    abilties?: any[];

    /**
     * Набор игровых предметов привилегии.
     */
    kitItems: KitItem[];

    /**
     * Ежедневный набор привилегии.
     */
    dailyKitItems?: KitItem[];
}
