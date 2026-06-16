import { IAbilityItem } from '@entities/donate';
import { KitItem } from './kit-item.interface';

/**
 * Модель данных карточки привилегии.
 */
export interface PrivilegeCard {
    /**
     * Идентификатор товара магазина (для покупки).
     */
    id?: string;

    /**
     * Название привилегии.
     */
    title: string;

    /**
     * Описание привилегии.
     */
    description?: string;

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
    privileges?: IAbilityItem[];

    /**
     * Набор игровых предметов привилегии.
     */
    kitItems: KitItem[];

    /**
     * Валюта цены: коины или рубли.
     */
    currency?: 'coins' | 'rubles';

    /**
     * Ежедневный набор привилегии.
     */
    dailyKitItems?: KitItem[];
}
