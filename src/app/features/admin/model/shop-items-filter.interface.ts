import { ShopCategory } from '@entities/donate';
import { ShopStatusFilter } from './shop-status-filter.type';

/**
 * Фильтры списка товаров магазина в админке.
 */
export interface ShopItemsFilter {
    /**
     * Текст поиска: по названию, коду набора и разделу.
     */
    query: string;

    /**
     * Категория или все.
     */
    category: ShopCategory | 'all';

    /**
     * Видимость.
     */
    status: ShopStatusFilter;

    /**
     * Только со скидкой.
     */
    discountOnly: boolean;
}
