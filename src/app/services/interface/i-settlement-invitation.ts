/**
 * Модель данных приглашения в селение.
 */
export interface ISettlementInvitation {
    /**
     * Идентификатор приглашения в селение.
     */
    id: string;

    /**
     * Идентификатор пользователя.
     */
    user_id: string;

    /**
     * Идентификатор селения.
     */
    settlement_id: string;
}
