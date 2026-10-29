/**
 * Заявка на вступление в надел.
 */
export interface IJoinRequest {
    /**
     * Идентификатор заявки.
     */
    id: string;

    /**
     * Идентификатор надела, в которое подана заявка.
     */
    settlement_id: string;

    /**
     * Идентификатор пользователя, подавшего заявку.
     */
    user_id: string;

    /**
     * Статус заявки (например, `pending`).
     */
    status?: string;

    /**
     * Дата создания заявки.
     */
    created_at?: string;
}
