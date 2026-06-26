/**
 * DTO ответа со статистикой рефералов текущего игрока.
 */
export interface IGetMyReferralStatsResponse {
    /**
     * Общее количество приглашённых игроков.
     */
    total_referrals: number | string;

    /**
     * Общее количество заработанных монет.
     */
    total_coins_earned: number | string;
}
