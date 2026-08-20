import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { LocalStorageService } from '@core/services/local-storage.service';
import { DiscordApiService, DiscordImageDto, DiscordImagesPageDto } from '@entities/discord';

/**
 * Время жизни кэша галереи в миллисекундах.
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Ключ для хранения кэша галереи в localStorage.
 */
const CACHE_KEY = 'lh_gallery_cache';

/**
 * Максимальное количество изображений, загружаемых за один запрос.
 */
const DISCORD_MAX_LIMIT = 100;

/**
 * Запись кэша галереи.
 */
interface GalleryCache {
    /**
     * Дата сохранения кэша.
     */
    savedAt: number;

    /**
     * Сохранённые изображения.
     */
    images: DiscordGalleryImage[];
}

/**
 * Элемент галереи скриншотов.
 */
export interface DiscordGalleryImage {
    /**
     * Уникальный идентификатор элемента (id сообщения + id вложения).
     */
    id: string;

    /**
     * URL изображения для отображения.
     */
    url: string;

    /**
     * URL изображения для предпросмотра.
     */
    proxyUrl: string;

    /**
     * Описание изображения.
     */
    alt: string;

    /**
     * Имя автора.
     */
    author: string;

    /**
     * Дата публикации.
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
 * Сервис получения скриншотов из Discord-канала через бэкенд.
 *
 * Загружает все изображения одним запросом до тех пор, пока бэкенд
 * не сообщит, что страница последняя.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordGalleryService {
    /**
     * API-сервис Discord.
     */
    private readonly discordApi = inject(DiscordApiService);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Идентификатор канала со скриншотами.
     */
    private readonly channelId = environment.discordScreenshotsChannelId;

    /**
     * Общий поток всех изображений галереи.
     * Гарантирует, что повторные подписки не инициируют лишние запросы.
     */
    private allImages$: Observable<DiscordGalleryImage[]> | null = null;

    /**
     * Загружает все изображения из канала скриншотов.
     *
     * @returns Observable со списком всех изображений.
     */
    public getAllImages$(): Observable<DiscordGalleryImage[]> {
        if (!this.channelId || !isPlatformBrowser(this.platformId)) {
            return of([]);
        }

        if (!this.allImages$) {
            this.allImages$ = this.fetchAllImages$(undefined, []).pipe(
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }

        return this.allImages$;
    }

    /**
     * Рекурсивно дозагружает изображения до последней страницы.
     *
     * @param before Идентификатор сообщения, перед которым нужно загружать.
     * @param accumulated Накопленный список изображений.
     * @returns Observable со списком всех изображений.
     */
    private fetchAllImages$(
        before: string | undefined,
        accumulated: DiscordGalleryImage[]
    ): Observable<DiscordGalleryImage[]> {
        return this.discordApi.getImages$(this.channelId, DISCORD_MAX_LIMIT, before).pipe(
            switchMap((page: DiscordImagesPageDto) => {
                const images = page.images.map((image: DiscordImageDto) => this.mapImage(image));
                const allImages = accumulated.concat(images);

                if (page.is_last_page || images.length === 0) {
                    return of(allImages);
                }

                // Курсор берётся из «сырых» id сообщений: подставлять сюда
                // сгенерированный id нельзя, бэкенд ждёт настоящий message_id.
                const lastMessageId = this.extractLastMessageId(page.images);

                if (!lastMessageId) {
                    return of(allImages);
                }

                return this.fetchAllImages$(lastMessageId, allImages);
            })
        );
    }

    /**
     * Извлекает id последнего сообщения из ответа бэкенда.
     *
     * @param images Список DTO изображений страницы.
     * @returns Id сообщения или `undefined`, если бэкенд его не прислал.
     */
    private extractLastMessageId(images: DiscordImageDto[]): string | undefined {
        for (let i = images.length - 1; i >= 0; i--) {
            const messageId = images[i].id.split('-')[0];

            if (messageId) {
                return messageId;
            }
        }

        return undefined;
    }

    /**
     * Возвращает кэшированные изображения, если они не устарели.
     *
     * @returns Список изображений или `null`.
     */
    public getCachedImages(): DiscordGalleryImage[] | null {
        const cache = this.localStorage.getItem<GalleryCache>(CACHE_KEY);

        if (!cache || Date.now() - cache.savedAt > CACHE_TTL) {
            return null;
        }

        return cache.images;
    }

    /**
     * Сохраняет изображения в локальный кэш.
     *
     * @param images Список изображений.
     */
    public saveCache(images: DiscordGalleryImage[]): void {
        this.localStorage.setItem(CACHE_KEY, {
            savedAt: Date.now(),
            images,
        });
    }

    /**
     * Преобразует DTO изображения Discord в элемент галереи.
     *
     * @param image DTO изображения.
     * @returns Элемент галереи.
     */
    private mapImage(image: {
        id: string;
        url: string;
        proxy_url: string;
        alt: string;
        author_name: string;
        timestamp: string;
        width?: number;
        height?: number;
    }): DiscordGalleryImage {
        return {
            id: image.id || this.buildFallbackId(image.url, image.timestamp),
            url: image.url,
            proxyUrl: image.proxy_url,
            alt: image.alt,
            author: image.author_name,
            timestamp: image.timestamp,
            width: image.width,
            height: image.height,
        };
    }

    /**
     * Строит стабильный идентификатор изображения, когда бэкенд вернул пустой `id`.
     *
     * Берёт id вложения из URL вида
     * `/attachments/{channelId}/{attachmentId}/{filename}` — он уникален в рамках Discord.
     * Если URL нестандартный, откатывается на метку времени.
     *
     * @param url URL изображения.
     * @param timestamp Дата публикации.
     * @returns Строковый идентификатор.
     */
    private buildFallbackId(url: string, timestamp: string): string {
        const attachmentId = url.match(/\/attachments\/\d+\/(\d+)\//)?.[1];

        return attachmentId ?? `${timestamp}:${url}`;
    }
}
