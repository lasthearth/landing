/**
 * DTO информации о сезоне Hunger Games, получаемый от API.
 *
 * Строго соответствует protobuf-контракту SeasonInfo.
 */
export interface ISeasonInfoDto {
    /**
     * Уникальный идентификатор сезона.
     */
    id: string;

    /**
     * Порядковый номер сезона.
     */
    number: number;

    /**
     * Дата начала сезона в формате ISO 8601.
     */
    started_at: string;

    /**
     * Дата окончания сезона в формате ISO 8601.
     *
     * Отсутствует, если сезон активен.
     */
    ended_at?: string;
}

/**
 * UI-модель информации о сезоне Hunger Games.
 *
 * Используется в компонентах админки для отображения текущего/исторического сезона.
 */
export interface ISeasonInfo {
    /**
     * Уникальный идентификатор сезона.
     */
    id: string;

    /**
     * Порядковый номер сезона.
     */
    number: number;

    /**
     * Дата начала сезона как объект Date.
     */
    startedAt: Date | null;

    /**
     * Дата начала сезона в человекочитаемом формате.
     *
     * Формат: "DD.MM.YY - HH:mm" или "—".
     */
    formattedStartedAt: string;

    /**
     * Дата окончания сезона как объект Date.
     *
     * `null`, если сезон активен.
     */
    endedAt: Date | null;

    /**
     * Дата окончания сезона в человекочитаемом формате.
     */
    formattedEndedAt: string;

    /**
     * Признак активности сезона.
     *
     * `true`, если поле `ended_at` отсутствует.
     */
    isActive: boolean;
}
