import { HttpParams } from '@angular/common/http';
import { LastSeenFilter, PlayersQuery } from '../model/players-query';

/**
 * Переводит фильтр «был в игре» в значение API; пусто — серверный дефолт.
 */
const LAST_SEEN_API: Record<LastSeenFilter, string> = {
    all: '',
    online: 'LAST_SEEN_ONLINE',
    day: 'LAST_SEEN_DAY',
    week: 'LAST_SEEN_WEEK',
    month: 'LAST_SEEN_MONTH',
    inactive: 'LAST_SEEN_INACTIVE',
};

/**
 * Переводит сортировку в значение API; пусто — серверный дефолт.
 */
const SORT_API: Record<PlayersQuery['sort'], string> = {
    seen: '',
    hours: 'PLAYER_SORT_HOURS',
    name: 'PLAYER_SORT_NAME',
};

/**
 * Собирает параметры запроса `GET /players`.
 *
 * Фильтр `all` и сортировка `seen` — дефолт сервера, поэтому не отправляются.
 *
 * @param query Запрос списка игроков.
 * @returns Параметры HTTP-запроса.
 */
export function toPlayersApiParams(query: PlayersQuery): HttpParams {
    const trimmed = query.query.trim();
    const lastSeen = LAST_SEEN_API[query.lastSeen];
    const sort = SORT_API[query.sort];

    let params = new HttpParams().set('page', String(query.page)).set('page_size', String(query.pageSize));

    if (trimmed) {
        params = params.set('query', trimmed);
    }

    if (lastSeen) {
        params = params.set('last_seen', lastSeen);
    }

    if (sort) {
        params = params.set('sort', sort);
    }

    return params;
}
