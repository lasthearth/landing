import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { YOUTUBE_CONFIG } from '../config/youtube-config';
import { YoutubeVideo } from '../model/youtube-video';

/**
 * Ответ API на запрос элементов плейлиста.
 */
interface PlaylistItemsResponse {
    /**
     * Список элементов плейлиста.
     */
    items: Array<{
        /**
         * Сниппет элемента.
         */
        snippet: {
            /**
             * Идентификатор ресурса.
             */
            resourceId: {
                /**
                 * Идентификатор видео.
                 */
                videoId: string;
            };
            /**
             * Заголовок видео.
             */
            title: string;
            /**
             * Описание видео.
             */
            description: string;
            /**
             * Превью видео.
             */
            thumbnails: {
                /**
                 * Стандартное превью.
                 */
                standard?: { url: string };
                /**
                 * Превью среднего размера.
                 */
                medium?: { url: string };
                /**
                 * Превью высокого разрешения.
                 */
                high?: { url: string };
                /**
                 * Максимальное превью.
                 */
                maxres?: { url: string };
                /**
                 * Превью по умолчанию.
                 */
                default?: { url: string };
            };
            /**
             * Дата публикации.
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
        };
    }>;
    /**
     * Токен следующей страницы.
     */
    nextPageToken?: string;
}

/**
 * Ключ для кэширования списка видео в localStorage.
 */
const CACHE_KEY = 'lh:youtube:videos';

/**
 * Время жизни кэша в миллисекундах (1 час).
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Максимальное количество видео, загружаемых за раз.
 */
const MAX_RESULTS = 50;

/**
 * Сервис для загрузки видео из YouTube Data API.
 */
@Injectable({
    providedIn: 'root',
})
export class YoutubeService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Кэшированный Observable списка видео.
     */
    private cachedVideos$: Observable<YoutubeVideo[]> | null = null;

    /**
     * Загружает видео из плейлиста загрузок канала.
     *
     * @returns Observable со списком видео.
     */
    public getVideos(): Observable<YoutubeVideo[]> {
        const cached = this.readCache();

        if (cached) {
            return of(cached);
        }

        if (this.cachedVideos$) {
            return this.cachedVideos$;
        }

        const params = {
            part: 'snippet',
            playlistId: YOUTUBE_CONFIG.uploadsPlaylistId,
            maxResults: MAX_RESULTS,
            key: YOUTUBE_CONFIG.apiKey,
        };

        this.cachedVideos$ = this.http
            .get<PlaylistItemsResponse>(`${YOUTUBE_CONFIG.baseUrl}/playlistItems`, { params })
            .pipe(
                map((response) => this.mapResponse(response)),
                shareReplay(1)
            );

        this.cachedVideos$.subscribe((videos) => {
            this.writeCache(videos);
        });

        return this.cachedVideos$;
    }

    /**
     * Преобразует ответ API в массив моделей видео.
     *
     * @param response Ответ API.
     * @returns Массив видео.
     */
    private mapResponse(response: PlaylistItemsResponse): YoutubeVideo[] {
        return (response.items || [])
            .filter((item) => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
            .map((item) => {
                const snippet = item.snippet;
                const thumbnails = snippet.thumbnails || {};
                const thumbnailUrl =
                    thumbnails.maxres?.url ||
                    thumbnails.standard?.url ||
                    thumbnails.high?.url ||
                    thumbnails.medium?.url ||
                    thumbnails.default?.url ||
                    '';

                return {
                    id: snippet.resourceId.videoId,
                    title: snippet.title,
                    description: snippet.description,
                    thumbnailUrl,
                    publishedAt: snippet.publishedAt,
                    channelId: snippet.channelId,
                    channelTitle: snippet.channelTitle,
                };
            });
    }

    /**
     * Читает кэш видео из localStorage.
     *
     * @returns Кэшированный список видео или null.
     */
    private readCache(): YoutubeVideo[] | null {
        if (!isPlatformBrowser(this.platformId)) {
            return null;
        }

        try {
            const raw = localStorage.getItem(CACHE_KEY);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as { videos: YoutubeVideo[]; timestamp: number };
            const age = Date.now() - parsed.timestamp;

            if (age > CACHE_TTL_MS) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return parsed.videos;
        } catch {
            return null;
        }
    }

    /**
     * Записывает список видео в localStorage.
     *
     * @param videos Список видео.
     */
    private writeCache(videos: YoutubeVideo[]): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ videos, timestamp: Date.now() }));
        } catch {
            // Игнорируем ошибки localStorage.
        }
    }
}
