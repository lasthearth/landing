/**
 * DTO записи результата сезона Hunger Games, получаемый от API.
 *
 * Строго соответствует protobuf-контракту SeasonResultEntry.
 */
export interface ISeasonResultEntryDto {
    /**
     * Идентификатор игрока.
     */
    player_id: string;

    /**
     * Игровое имя игрока.
     */
    player_name: string;

    /**
     * Текущий рейтинг ELO.
     */
    elo: number;

    /**
     * Количество побед.
     */
    wins: number;

    /**
     * Количество убийств.
     */
    kills: number;
}

/**
 * UI-модель записи результата сезона Hunger Games.
 */
export interface ISeasonResultEntry {
    /**
     * Идентификатор игрока.
     */
    playerId: string;

    /**
     * Игровое имя игрока.
     */
    playerName: string;

    /**
     * Текущий рейтинг ELO.
     */
    elo: number;

    /**
     * Количество побед.
     */
    wins: number;

    /**
     * Количество убийств.
     */
    kills: number;
}
