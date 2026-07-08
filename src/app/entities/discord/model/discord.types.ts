/**
 * DTO сообщения Discord, возвращаемого бэкендом.
 */
export interface DiscordMessageDto {
    /**
     * Идентификатор сообщения.
     */
    id: string;

    /**
     * Очищенный текст сообщения.
     */
    content: string;

    /**
     * Имя автора.
     */
    author_name: string;

    /**
     * Дата отправки в формате ISO 8601.
     */
    timestamp: string;

    /**
     * Тип сообщения.
     */
    type: 'global' | 'local' | 'server' | 'event' | 'unknown';
}

/**
 * DTO изображения Discord, возвращаемого бэкендом.
 */
export interface DiscordImageDto {
    /**
     * Идентификатор изображения.
     */
    id: string;

    /**
     * URL изображения.
     */
    url: string;

    /**
     * URL прокси-сервера Discord.
     */
    proxy_url: string;

    /**
     * Описание изображения.
     */
    alt: string;

    /**
     * Имя автора.
     */
    author_name: string;

    /**
     * Дата публикации в формате ISO 8601.
     */
    timestamp: string;

    /**
     * Ширина изображения.
     */
    width?: number;

    /**
     * Высота изображения.
     */
    height?: number;
}

/**
 * Результат страницы сообщений.
 */
export interface DiscordMessagesPageDto {
    /**
     * Список сообщений.
     */
    messages: DiscordMessageDto[];

    /**
     * Признак последней страницы.
     */
    is_last_page: boolean;
}

/**
 * Результат страницы изображений.
 */
export interface DiscordImagesPageDto {
    /**
     * Список изображений.
     */
    images: DiscordImageDto[];

    /**
     * Признак последней страницы.
     */
    is_last_page: boolean;
}

/**
 * Запрос на публикацию новости в Discord.
 */
export interface SendDiscordNewsRequest {
    /**
     * Заголовок новости.
     */
    title: string;

    /**
     * Содержание новости (HTML).
     */
    content: string;

    /**
     * URL превью-изображения.
     */
    preview_url?: string;

    /**
     * URL новости на сайте.
     */
    news_url: string;

    /**
     * Автор новости.
     */
    author?: string;
}
