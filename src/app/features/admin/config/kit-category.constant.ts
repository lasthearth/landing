import { KitCategory } from '@entities/kitdef';

/**
 * Ключи переводов названий категорий захваченного набора.
 *
 * Категория одна и та же в двух местах админки: в панели наборов
 * и в бейдже товара магазина, поэтому ключи объявлены один раз.
 * Подписи из `@entities/donate` (`ShopCategory`) структурно совпадают
 * с `KitCategory`, поэтому константа годится для обоих списков.
 */
export const KIT_CATEGORY_LABEL_KEYS: Record<KitCategory, string> = {
    kit: 'admin.kits.category.kit',
    privilege: 'admin.kits.category.privilege',
    special: 'admin.kits.category.special',
};

/**
 * Порядок категорий набора в выпадающих списках админки.
 *
 * Значения строго из контракта `PATCH /v1/kitdefs/{code}`:
 * всё, что не входит в этот список, сервер отклоняет с 400.
 */
export const KIT_CATEGORIES: readonly KitCategory[] = ['kit', 'privilege', 'special'];
