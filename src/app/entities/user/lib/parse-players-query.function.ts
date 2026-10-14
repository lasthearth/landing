import { PLAYERS_DEFAULT_QUERY } from '../config/players-query-defaults.constant';
import { LastSeenFilter, PlayerSort, PlayersQuery } from '../model/players-query';

/**
 * Фильтры «был в игре», которые понимает страница.
 */
const LAST_SEEN_VALUES: readonly LastSeenFilter[] = ['all', 'online', 'day', 'week', 'month', 'inactive'];

/**
 * Порядки сортировки, которые понимает страница.
 */
const SORT_VALUES: readonly PlayerSort[] = ['seen', 'hours', 'name'];

/**
 * Читает состояние списка игроков из query-параметров адреса.
 *
 * Незнакомые значения молча заменяются значениями по умолчанию: ссылкой
 * можно поделиться, а мусор в адресе не должен ломать страницу.
 *
 * @param source Источник query-параметров (например, `ActivatedRoute.snapshot.queryParamMap`).
 * @returns Запрос списка игроков.
 */
export function parsePlayersQuery(source: { get(name: string): string | null }): PlayersQuery {
    const seen = source.get('seen');
    const sort = source.get('sort');
    const page = Number(source.get('page'));

    return {
        query: source.get('q')?.trim() ?? PLAYERS_DEFAULT_QUERY.query,
        lastSeen: LAST_SEEN_VALUES.find((value) => value === seen) ?? PLAYERS_DEFAULT_QUERY.lastSeen,
        sort: SORT_VALUES.find((value) => value === sort) ?? PLAYERS_DEFAULT_QUERY.sort,
        page: Number.isInteger(page) && page > 0 ? page : PLAYERS_DEFAULT_QUERY.page,
        pageSize: PLAYERS_DEFAULT_QUERY.pageSize,
    };
}
