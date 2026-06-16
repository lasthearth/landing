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

    /**
     * Итоговое место в сезоне.
     *
     * Присутствует только в архивном лидерборде завершённого сезона.
     */
    rank?: number;

    /**
     * Награда в осколках искры.
     *
     * Присутствует только в архивном лидерборде завершённого сезона.
     */
    reward_coins?: string;
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

    /**
     * Итоговое место в сезоне.
     */
    rank?: number;

    /**
     * Награда в осколках искры.
     */
    rewardCoins?: string;
}
