import { PlayersQuery } from '../model/players-query';
import { PLAYERS_PAGE_SIZE } from './players-page-size.constant';

/**
 * Запрос списка игроков по умолчанию.
 *
 * Значения по умолчанию не пишутся ни в адрес, ни в параметры API:
 * `all` и `seen` — дефолт сервера, первая страница — дефолт адреса.
 */
export const PLAYERS_DEFAULT_QUERY: PlayersQuery = {
    query: '',
    lastSeen: 'all',
    sort: 'seen',
    page: 1,
    pageSize: PLAYERS_PAGE_SIZE,
};
