import { IKitDef } from '@entities/kitdef';
import { KitSort } from '../model/kit-sort.type';

/**
 * Сортирует захваченные наборы для списка в админке.
 *
 * Набор без даты считается самым старым. По названию — набор без названия
 * сравнивается по коду, чтобы не сбиваться в начало списка.
 *
 * @param kits Наборы.
 * @param sort Порядок.
 * @returns Новый отсортированный массив.
 */
export function sortKits(kits: readonly IKitDef[], sort: KitSort): IKitDef[] {
    const created = (kit: IKitDef): number => kit.createdAt?.getTime() ?? 0;
    const updated = (kit: IKitDef): number => (kit.updatedAt ?? kit.createdAt)?.getTime() ?? 0;

    return [...kits].sort((a, b) => {
        switch (sort) {
            case 'oldest':
                return created(a) - created(b);
            case 'updated':
                return updated(b) - updated(a);
            case 'name':
                return (a.title || a.code).localeCompare(b.title || b.code, 'ru');
            case 'newest':
            default:
                return created(b) - created(a);
        }
    });
}
