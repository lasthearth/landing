/**
 * Элемент игрового чата.
 */
export interface GameChatMessage {
    /**
     * Уникальный идентификатор сообщения.
     */
    id: string;

    /**
     * Текст сообщения.
     */
    content: string;

    /**
     * Имя автора.
     */
    author: string;

    /**
     * Дата отправки сообщения.
     */
    timestamp: string;

    /**
     * Тип сообщения (если бот помечает префиксами).
     */
    type: GameChatMessageType;
}

/**
 * Тип сообщения игрового чата.
 */
export type GameChatMessageType =
    | 'global'
    | 'local'
    | 'server'
    | 'event'
    | 'unknown';

/**
 * Результат загрузки страницы чата.
 */
export interface GameChatPage {
    /**
     * Список сообщений.
     */
    messages: GameChatMessage[];

    /**
     * Признак последней страницы.
     */
    isLastPage: boolean;
}
