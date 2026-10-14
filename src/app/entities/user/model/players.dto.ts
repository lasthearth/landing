import { LastSeenFilter } from './players-query';

/**
 * Игрок в ответе `GET /players`.
 *
 * Часы и счётчики сервер может отдать строками — их приводит к числу
 * `PlayersApiService`. Ник приходит то как `nickname`, то как
 * `user_game_name`: принимаем оба поля.
 */
export interface PlayerListItemDto {
    /**
     * Идентификатор пользователя.
     */
    user_id: string;

    /**
     * Ник, если сервер отдаёт его отдельным полем.
     */
    nickname?: string;

    /**
     * Игровое имя.
     */
    user_game_name?: string;

    /**
     * Ссылки на аватар в разных разрешениях.
     */
    avatar?: { original?: string; x96?: string; x48?: string } | null;

    /**
     * Статус присутствия.
     */
    is_online?: boolean;

    /**
     * Последний вход (ISO).
     */
    last_online?: string | null;

    /**
     * Часы в игре (число или строка).
     */
    hours_played?: number | string | null;

    /**
     * Описание «О себе».
     */
    about?: string | null;
}

/**
 * Ответ `GET /players`.
 */
export interface PlayersPageDto {
    /**
     * Игроки текущей страницы.
     */
    players?: PlayerListItemDto[] | null;

    /**
     * Всего игроков (число или строка).
     */
    total?: number | string | null;

    /**
     * Номер страницы.
     */
    page?: number | string | null;

    /**
     * Размер страницы.
     */
    page_size?: number | string | null;

    /**
     * Счётчики фильтров «был в игре».
     */
    counts?: Partial<Record<LastSeenFilter, number | string | null>> | null;
}
