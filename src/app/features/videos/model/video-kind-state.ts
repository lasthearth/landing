import { YoutubeVideo } from './youtube-video';

/**
 * Состояние одного раздела страницы видео.
 */
export interface VideoKindState {
    /**
     * Загруженные ролики.
     */
    videos: YoutubeVideo[];

    /**
     * Токен следующей страницы API, если она есть.
     */
    nextPageToken: string | null;

    /**
     * Сколько всего роликов в разделе.
     */
    total: number;

    /**
     * Идёт загрузка.
     */
    loading: boolean;

    /**
     * Загрузка завершилась ошибкой.
     */
    error: boolean;

    /**
     * Первая страница уже загружена.
     */
    loaded: boolean;
}
