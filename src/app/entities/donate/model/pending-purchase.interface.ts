/**
 * UI-модель ожидающей выдачи покупки.
 */
export interface IPendingPurchase {
    /**
     * Уникальный идентификатор покупки.
     */
    id: string;

    /**
     * Идентификатор игрока, совершившего покупку.
     */
    playerId: string;

    /**
     * Игровой ник игрока.
     */
    playerName: string;

    /**
     * URL аватара игрока.
     */
    playerAvatarUrl: string;

    /**
     * Идентификатор купленного товара.
     */
    itemId: string;

    /**
     * Название купленного товара.
     */
    itemName: string;

    /**
     * Фактически оплаченная цена покупки.
     */
    pricePaid: string;

    /**
     * Базовая цена товара.
     */
    basePrice: string;

    /**
     * Процент скидки.
     */
    discountPercent: number;

    /**
     * Идентификатор игрока, который выдал покупку.
     */
    issuedBy: string;

    /**
     * Комментарий к заказу.
     */
    comment: string;

    /**
     * Статус покупки.
     */
    status: string;

    /**
     * Дата создания как объект Date.
     */
    createdAt: Date | null;

    /**
     * Дата создания в человекочитаемом формате.
     */
    formattedDate: string;
}
