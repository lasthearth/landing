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
     * Стоимость привилегии.
     */
    price: string;

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
