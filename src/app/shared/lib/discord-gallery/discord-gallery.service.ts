import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, Observable, of } from 'rxjs';
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
 * Результат страницы загрузки изображений.
 */
export interface DiscordGalleryPage {
    /**
     * Список изображений на странице.
     */
    images: DiscordGalleryImage[];

    /**
     * Признак того, что это последняя страница.
     */
    isLastPage: boolean;
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
 * Запрашивает готовую страницу изображений у API.
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
     * Возвращает страницу изображений из канала скриншотов.
     *
     * @param limit Максимальное количество изображений на странице.
     * @param before Идентификатор сообщения, перед которым нужно загружать.
     * @returns Observable со страницей изображений.
     */
    public getImages$(limit: number, before?: string): Observable<DiscordGalleryPage> {
        if (!this.channelId || !isPlatformBrowser(this.platformId)) {
            return of({ images: [], isLastPage: true });
        }

        return this.discordApi.getImages$(this.channelId, limit, before).pipe(
            map((page: DiscordImagesPageDto) => ({
                images: page.images.map((image: DiscordImageDto) => this.mapImage(image)),
                isLastPage: page.is_last_page,
            })),
            catchError((error) => {
                console.error('[DiscordGalleryService] Ошибка загрузки изображений:', error);

                return of({ images: [], isLastPage: true });
            })
        );
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
            id: image.id,
            url: image.url,
            proxyUrl: image.proxy_url,
            alt: image.alt,
            author: image.author_name,
            timestamp: image.timestamp,
            width: image.width,
            height: image.height,
        };
    }
}
