/**
 * Интерфейс записи таблицы лидеров.
 */
export interface ILeaderBoard {
    /**
     * Имя игрока.
     */
    name: string;

    /**
     * Количество смертей.
     */
    deaths: number;

    /**
     * Количество убийств.
     */
    kills: number;

    /**
     * Количество сыгранных часов.
     */
    hours_played: number;

    /**
     * Идентификатор пользователя.
     */
    user_id: string;
}
