import { GameChatMessage } from './game-chat-message';

/**
 * Строка ленты игрового чата, готовая к выводу.
 */
export interface GameChatRow {
    /**
     * Исходное сообщение.
     */
    message: GameChatMessage;

    /**
     * Текст сообщения в виде безопасного HTML (Discord-разметка, эмодзи).
     */
    html: string;

    /**
     * Короткая подпись времени: «сейчас», «5 мин», «18:40».
     */
    time: string;

    /**
     * Полная дата для подсказки.
     */
    fullTime: string;

    /**
     * Время в ISO для атрибута `datetime`.
     */
    iso: string | null;

    /**
     * Подпись разделителя дня, если с этого сообщения начинается новый день.
     */
    dayLabel: string | null;
}
