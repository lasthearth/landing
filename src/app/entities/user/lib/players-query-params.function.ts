import { PLAYERS_DEFAULT_QUERY } from '../config/players-query-defaults.constant';
import { PlayersQuery } from '../model/players-query';

/**
 * Превращает состояние списка игроков в query-параметры адреса.
 *
 * Значения по умолчанию не пишутся: адрес `/players` — тот же экран,
 * что и `/players?seen=all&sort=seen&page=1`.
 *
 * @param query Запрос списка игроков.
 * @returns Параметры адреса; `null` означает «параметр убрать».
 */
export function toPlayersQueryParams(query: PlayersQuery): Record<string, string | null> {
    return {
        q: query.query.trim() || null,
        seen: query.lastSeen === PLAYERS_DEFAULT_QUERY.lastSeen ? null : query.lastSeen,
        sort: query.sort === PLAYERS_DEFAULT_QUERY.sort ? null : query.sort,
        page: query.page > PLAYERS_DEFAULT_QUERY.page ? String(query.page) : null,
    };
}
