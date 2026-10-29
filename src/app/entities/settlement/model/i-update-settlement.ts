/**
 * Запрос на обновление данных надела.
 */
export interface IUpdateSettlementRequest {
    /**
     * Название надела.
     */
    name: string;

    /**
     * Описание надела.
     */
    description: string;

    /**
     * Вложения надела (изображения и их описания).
     */
    attachments: IUpdateAttachment[];
}

/**
 * Вложение в запросе на обновление надела.
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
