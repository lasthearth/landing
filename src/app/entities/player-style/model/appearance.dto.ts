/**
 * Сохранённый вид игрока, как его отдаёт сервер (`appearance.v1.Appearance`).
 */
export interface AppearanceDto {
    readonly user_id: string;
    readonly banner_id: string;
    readonly banner_effect: string;
    readonly frame_id: string;
    readonly frame_effect: string;
    /**
     * Значок-титул под ником; пусто — без титула.
     */
    readonly title_key: string;
    readonly updated_at?: string;
}

export interface AppearancesDto {
    readonly appearances?: AppearanceDto[];
}

/**
 * Тело `PUT /v1/appearances/me`.
 */
export type SaveAppearanceRequest = Omit<AppearanceDto, 'user_id' | 'updated_at'>;

/**
 * Своё положение: от чего зависят открытые элементы (`appearance.v1.Standing`).
 */
export interface StandingDto {
    readonly hours?: number;
    readonly kills?: number;
    readonly deaths?: number;
    readonly hours_rank?: number;
    readonly kills_rank?: number;
    readonly settlement_role?: string;
    readonly hunger_games_wins?: number;
    readonly referrals?: number;
    readonly events?: number;
    readonly days?: number;
    readonly purchased_banner_ids?: string[];
}
