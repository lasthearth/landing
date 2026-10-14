import { LastSeenFilter } from './players-query';

/**
 * Игрок в списке `/players`.
 *
 * Модель экрана, а не DTO: аватар уже собран в один адрес, часы приведены
 * к числу, описание — к строке.
 */
export interface PlayerListItem {
    /**
     * Идентификатор пользователя.
     */
    userId: string;

    /**
     * Игровой ник.
     */
    nickname: string;

    /**
     * Аватар.
     */
    avatarUrl: string;

    /**
     * Сейчас в игре.
     */
    isOnline: boolean;

    /**
     * Последний вход (ISO), если известен.
     */
    lastOnline: string | null;

    /**
     * Часы в игре.
     */
    hours: number;

    /**
     * Описание «О себе»; пусто — игрок его не писал.
     */
    about: string;
}

/**
 * Страница списка игроков с итогами и счётчиками фильтров.
 */
export interface PlayersPage {
    /**
     * Игроки запрошенной страницы.
     */
    players: PlayerListItem[];

    /**
     * Сколько всего игроков подходит под запрос.
     */
    total: number;

    /**
     * Номер отданной страницы.
     */
    page: number;

    /**
     * Размер страницы, принятый сервером.
     */
    pageSize: number;

    /**
     * Сколько игроков в каждом фильтре «был в игре».
     */
    counts: Record<LastSeenFilter, number>;
}
