import { News } from '@entities/news';

/**
 * Состояние страницы новости.
 *
 * - `loading` — данные загружаются;
 * - `ready` — новость найдена; `others` — другие свежие новости для блока внизу;
 * - `not-found` — новости нет или она удалена.
 */
export type NewsPageState =
    | { status: 'loading' }
    | { status: 'ready'; news: News; others: News[] }
    | { status: 'not-found' };
