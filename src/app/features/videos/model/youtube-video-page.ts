import { YoutubeVideo } from './youtube-video';

/**
 * Страница роликов из плейлиста YouTube.
 */
export interface YoutubeVideoPage {
    /**
     * Ролики страницы.
     */
    videos: YoutubeVideo[];

    /**
     * Токен следующей страницы, если она есть.
     */
    nextPageToken: string | null;

    /**
     * Сколько всего роликов в плейлисте.
     */
    total: number;
}
