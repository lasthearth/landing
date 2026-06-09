/**
 * DTO записи текущего лидерборда Hunger Games.
 *
 * Строго соответствует ответу GET /v1/hungergames/leaderboard.
 */
export interface ILeaderboardEntryDto {
    /**
     * Игровое имя игрока.
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

/**
 * UI-модель записи текущего лидерборда Hunger Games.
 */
export interface ILeaderboardEntry {
    /**
     * Игровое имя игрока.
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
    hoursPlayed: number;

    /**
     * Идентификатор пользователя.
     */
    userId: string;
}
