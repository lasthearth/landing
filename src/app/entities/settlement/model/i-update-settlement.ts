/**
 * Запрос на обновление данных поселения.
 */
export interface IUpdateSettlementRequest {
    /**
     * Название поселения.
     */
    name: string;

    /**
     * Описание поселения.
     */
    description: string;

    /**
     * Вложения поселения (изображения и их описания).
     */
    attachments: IUpdateAttachment[];
}

/**
 * Вложение в запросе на обновление поселения.
 */
export interface IUpdateAttachment {
    /**
     * Публичный URL вложения.
     */
    url: string;

    /**
     * Описание вложения.
     */
    description: string;
}
