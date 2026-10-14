import { PLAYERS_DEFAULT_QUERY } from '../config/players-query-defaults.constant';
import { PlayersQuery } from '../model/players-query';
import { parsePlayersQuery } from './parse-players-query.function';
import { toPlayersApiParams } from './players-api-params.function';
import { toPlayersQueryParams } from './players-query-params.function';

/**
 * Источник query-параметров для проверок.
 *
 * @param params Параметры адреса.
 * @returns Источник с тем же контрактом, что у `ParamMap`.
 */
function source(params: Record<string, string>): { get(name: string): string | null } {
    return { get: (name: string) => params[name] ?? null };
}

describe('PlayersQuery и адрес страницы', () => {
    it('пустой адрес даёт значения по умолчанию', () => {
        expect(parsePlayersQuery(source({}))).toEqual(PLAYERS_DEFAULT_QUERY);
    });

    it('читает поиск, фильтр, сортировку и страницу', () => {
        expect(parsePlayersQuery(source({ q: ' ве ', seen: 'week', sort: 'hours', page: '2' }))).toEqual({
            query: 'ве',
            lastSeen: 'week',
            sort: 'hours',
            page: 2,
            pageSize: PLAYERS_DEFAULT_QUERY.pageSize,
        });
    });

    it('незнакомые значения заменяет значениями по умолчанию', () => {
        expect(parsePlayersQuery(source({ seen: 'вечность', sort: 'мусор', page: '-3' }))).toEqual(
            PLAYERS_DEFAULT_QUERY
        );
    });

    it('значения по умолчанию в адрес не пишутся', () => {
        expect(toPlayersQueryParams(PLAYERS_DEFAULT_QUERY)).toEqual({
            q: null,
            seen: null,
            sort: null,
            page: null,
        });
    });

    it('непустое состояние попадает в адрес', () => {
        const query: PlayersQuery = { query: 'ве', lastSeen: 'month', sort: 'name', page: 3, pageSize: 24 };

        expect(toPlayersQueryParams(query)).toEqual({ q: 'ве', seen: 'month', sort: 'name', page: '3' });
    });

    it('состояние переживает запись в адрес и чтение из него', () => {
        const query: PlayersQuery = { query: 'ве', lastSeen: 'day', sort: 'hours', page: 4, pageSize: 24 };
        const params = toPlayersQueryParams(query);
        const written: Record<string, string> = {};

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null) {
                written[key] = value;
            }
        });

        expect(parsePlayersQuery(source(written))).toEqual(query);
    });
});

describe('PlayersQuery и параметры API', () => {
    it('значения по умолчанию не отправляются', () => {
        const params = toPlayersApiParams(PLAYERS_DEFAULT_QUERY);

        expect(params.get('page')).toBe('1');
        expect(params.get('page_size')).toBe('24');
        expect(params.get('query')).toBeNull();
        expect(params.get('last_seen')).toBeNull();
        expect(params.get('sort')).toBeNull();
    });

    it('фильтр и сортировка переводятся в значения API', () => {
        const params = toPlayersApiParams({ query: 'ве', lastSeen: 'inactive', sort: 'hours', page: 2, pageSize: 24 });

        expect(params.get('query')).toBe('ве');
        expect(params.get('last_seen')).toBe('LAST_SEEN_INACTIVE');
        expect(params.get('sort')).toBe('PLAYER_SORT_HOURS');
        expect(params.get('page')).toBe('2');
    });

    it('сортировка по нику уходит в API своим значением', () => {
        const params = toPlayersApiParams({ ...PLAYERS_DEFAULT_QUERY, sort: 'name' });

        expect(params.get('sort')).toBe('PLAYER_SORT_NAME');
    });
});
