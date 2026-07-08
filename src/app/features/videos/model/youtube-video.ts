/**
 * Модель видео из YouTube.
 */
export interface YoutubeVideo {
    /**
     * Идентификатор видео.
     */
    id: string;

    /**
     * Заголовок видео.
     */
    title: string;

    /**
     * Описание видео.
     */
    description: string;

    /**
     * URL превью видео.
     */
    thumbnailUrl: string;

    /**
     * Дата публикации в формате ISO 8601.
     */
    publishedAt: string;

    /**
     * Идентификатор канала.
     */
    channelId: string;

    /**
     * Название канала.
     */
    channelTitle: string;
}
