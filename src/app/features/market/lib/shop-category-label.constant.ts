import { ShopCategory } from '@entities/donate';

/**
 * Ключи перевода подписей категорий товаров магазина.
 *
 * Подпись показывает посетителю, к какой из трёх групп витрины относится запись:
 * набор, привилегия или особый товар.
 */
export const SHOP_CATEGORY_LABEL_KEY: Record<ShopCategory, string> = {
    kit: 'market.category.kit',
    privilege: 'market.category.privilege',
    special: 'market.category.special',
};
