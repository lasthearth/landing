/**
 * DTO участника матча для записи результата.
 *
 * Строго соответствует protobuf-контракту MatchPlayer.
 */
export interface IMatchPlayerDto {
    /**
     * Идентификатор игрока.
     */
    player_id: string;

    /**
     * Игровое имя игрока.
     */
    player_name: string;

    /**
     * Занятое место (чем меньше, тем выше).
     */
    place: number;

    /**
     * Количество убийств в матче.
     */
    kills: number;
}

/**
 * UI-модель участника матча.
 */
export interface IMatchPlayer {
    /**
     * Идентификатор игрока.
     */
    playerId: string;

    /**
     * Игровое имя игрока.
     */
    playerName: string;

    /**
     * Занятое место.
     */
    place: number;

    /**
     * Количество убийств.
     */
    kills: number;
}

/**
 * DTO запроса на запись результата матча.
 *
 * Передаётся в `POST /v1/hungergames/match`.
 */
export interface IMatchResultRequestDto {
    /**
     * Список участников матча с результатами.
     */
    players: IMatchPlayerDto[];
}

/**
 * UI-модель запроса на запись результата матча.
 */
export interface IMatchResultRequest {
    /**
     * Список участников матча с результатами.
     */
    players: IMatchPlayer[];
}
