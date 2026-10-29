import { IKitDef, KitCategory } from '@entities/kitdef';
import { matchesQuery } from './matches-query.function';

/**
 * Отбирает захваченные наборы по поиску и категории.
 *
 * Поиск идёт по коду, названию и кодам предметов внутри набора — так находится
 * набор, в котором лежит нужный предмет.
 *
 * @param kits Все наборы.
 * @param query Текст поиска.
 * @param category Категория или все.
 * @returns Подходящие наборы в исходном порядке.
 */
export function filterKits(kits: readonly IKitDef[], query: string, category: KitCategory | 'all'): IKitDef[] {
    return kits.filter(
        (kit) =>
            (category === 'all' || kit.category === category) &&
            matchesQuery(query, [kit.code, kit.title, ...kit.items.map((item) => item.gameCode)])
    );
}
