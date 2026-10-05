/**
 * Заявление в ленте дипломатии.
 */
export interface DiplomacyStatement {
    /**
     * Идентификатор сообщения Discord (пустой, если API его не вернул).
     */
    id: string;

    /**
     * Автор заявления.
     */
    author: string;

    /**
     * Текст в HTML (из Discord-разметки).
     */
    html: string;

    /**
     * Время публикации (ISO 8601).
     */
    timestamp: string;
}
