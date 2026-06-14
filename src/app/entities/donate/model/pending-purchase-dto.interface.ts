/**
 * DTO ожидающей выдачи покупки, получаемый от API.
 */
export interface IPendingPurchaseDto {
    /**
     * Уникальный идентификатор покупки.
     */
    id: string;

    /**
     * Идентификатор игрока, совершившего покупку.
     */
    player_id: string;

    /**
     * Игровой ник игрока, совершившего покупку.
     */
    player_name?: string;

    /**
     * URL аватара игрока.
     */
    player_avatar_url?: string;

    /**
     * Идентификатор купленного товара.
     */
    item_id?: string;

    /**
     * Название купленного товара.
     */
    item_name?: string;

    /**
     * Фактически оплаченная цена покупки как строка (decimal as string).
     */
    price_paid?: string;

    /**
     * Базовая цена товара как строка (decimal as string).
     */
    base_price?: string;

    /**
     * Процент скидки.
     */
    discount_percent?: number;

    /**
     * Идентификатор игрока, который выдал покупку.
     */
    issued_by?: string;

    /**
     * Комментарий к заказу.
     */
    comment?: string;

    /**
     * Статус покупки.
     */
    status?: string;

    /**
     * Дата создания в формате ISO 8601.
     */
    created_at?: string;
}
