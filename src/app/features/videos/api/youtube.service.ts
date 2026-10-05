import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { YOUTUBE_CONFIG } from '../config/youtube-config';
import { VIDEO_KIND_PLAYLIST_PREFIX } from '../config/video-kinds.constant';
import { VideoKind } from '../model/video-kind';
import { YoutubeVideo } from '../model/youtube-video';
import { YoutubeVideoPage } from '../model/youtube-video-page';

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

    /**
     * Сведения о выдаче.
     */
    pageInfo?: {
        /**
         * Сколько всего элементов в плейлисте.
         */
        totalResults: number;
    };
}

/**
 * Префикс ключа кэша первой страницы раздела в localStorage.
 */
const CACHE_KEY_PREFIX = 'lh:youtube:page:';

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
     * Загруженные в этой вкладке страницы: ключ — раздел и токен страницы.
     */
    private readonly pages = new Map<string, Observable<YoutubeVideoPage>>();

    /**
     * Загружает страницу роликов раздела.
     *
     * Первая страница кэшируется в localStorage на час, остальные — только в памяти.
     *
     * @param kind Раздел: ролики, стримы или шортсы.
     * @param pageToken Токен страницы; без него — первая страница.
     * @returns Observable со страницей роликов.
     */
    public getPage(kind: VideoKind, pageToken?: string): Observable<YoutubeVideoPage> {
        if (!pageToken) {
            const cached = this.readCache(kind);
            if (cached) {
                return of(cached);
            }
        }

        const key = `${kind}:${pageToken ?? ''}`;
        const existing = this.pages.get(key);
        if (existing) {
            return existing;
        }

        const params: Record<string, string | number> = {
            part: 'snippet',
            playlistId: this.playlistId(kind),
            maxResults: MAX_RESULTS,
            key: YOUTUBE_CONFIG.apiKey,
        };

        if (pageToken) {
            params['pageToken'] = pageToken;
        }

        const request$ = this.http.get<PlaylistItemsResponse>(`${YOUTUBE_CONFIG.baseUrl}/playlistItems`, { params }).pipe(
            map((response) => this.mapResponse(response)),
            tap((page) => {
                if (!pageToken) {
                    this.writeCache(kind, page);
                }
            }),
            shareReplay(1)
        );

        this.pages.set(key, request$);
        return request$;
    }

    /**
     * Возвращает id служебного плейлиста раздела.
     *
     * @param kind Раздел.
     */
    private playlistId(kind: VideoKind): string {
        const channelSuffix = YOUTUBE_CONFIG.uploadsPlaylistId.slice(2);
        return `${VIDEO_KIND_PLAYLIST_PREFIX[kind]}${channelSuffix}`;
    }

    /**
     * Преобразует ответ API в страницу роликов.
     *
     * @param response Ответ API.
     * @returns Страница роликов.
     */
    private mapResponse(response: PlaylistItemsResponse): YoutubeVideoPage {
        const videos = (response.items || [])
            .filter((item) => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
            .map((item): YoutubeVideo => {
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

        return {
            videos,
            nextPageToken: response.nextPageToken ?? null,
            total: response.pageInfo?.totalResults ?? videos.length,
        };
    }

    /**
     * Читает кэш первой страницы раздела из localStorage.
     *
     * @param kind Раздел.
     * @returns Страница или null, если кэша нет или он устарел.
     */
    private readCache(kind: VideoKind): YoutubeVideoPage | null {
        if (!isPlatformBrowser(this.platformId)) {
            return null;
        }

        try {
            const raw = localStorage.getItem(CACHE_KEY_PREFIX + kind);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as { page: YoutubeVideoPage; timestamp: number };

            if (Date.now() - parsed.timestamp > CACHE_TTL_MS || !Array.isArray(parsed.page?.videos)) {
                localStorage.removeItem(CACHE_KEY_PREFIX + kind);
                return null;
            }

            return parsed.page;
        } catch {
            return null;
        }
    }

    /**
     * Записывает первую страницу раздела в localStorage.
     *
     * @param kind Раздел.
     * @param page Страница роликов.
     */
    private writeCache(kind: VideoKind, page: YoutubeVideoPage): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        try {
            localStorage.setItem(CACHE_KEY_PREFIX + kind, JSON.stringify({ page, timestamp: Date.now() }));
            // Старый общий кэш больше не читается.
            localStorage.removeItem('lh:youtube:videos');
        } catch {
            // Игнорируем ошибки localStorage.
        }
    }
}
