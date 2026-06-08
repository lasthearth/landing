/**
 * Модель выбранного игрока для админских операций.
 */
export interface ISelectedPlayer {
    /**
     * Идентификатор пользователя.
     */
    playerId: string;

    /**
     * Игровое имя пользователя.
     */
    playerName: string;

    /**
     * URL аватара пользователя.
     */
    avatar?: string;
}
