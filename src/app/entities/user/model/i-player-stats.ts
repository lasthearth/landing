/**
 * Игровая статистика игрока с сервера статистики.
 * Ответ эндпоинта `GET /v1/{name}/stats` (StatsService).
 */
export interface IPlayerStats {
    /**
     * Игровое имя игрока.
     */
    name: string;

    /**
     * Количество смертей персонажа.
     */
    death_count: number;

    /**
     * Наигранное время в часах.
     */
    hours_played: number;

    /**
     * Метка времени последнего появления онлайн (Unix, секунды).
     * Может отсутствовать/быть нулём, если данных нет.
     */
    last_online: number | string;

    /**
     * Количество убитых игроков (PvP).
     */
    players_killed: number;
}
