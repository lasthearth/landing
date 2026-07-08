import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { LocalStorageService } from '@core/services/local-storage.service';
import { SKIP_AUTH } from '@core/interceptors/auth.interceptor';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';

/**
 * Количество сообщений, запрашиваемых за один раз из Discord.
 */
const DISCORD_PAGE_SIZE = 100;

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
 * Модель вложения сообщения Discord.
 */
interface DiscordAttachment {
    /**
     * Идентификатор вложения.
     */
    id: string;

    /**
     * Имя файла.
     */
    filename: string;

    /**
     * MIME-тип содержимого.
     */
    content_type?: string;

    /**
     * Прямой URL к вложению.
     */
    url: string;

    /**
     * URL прокси-сервера Discord для вложения.
     */
    proxy_url: string;

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
 * Модель сообщения Discord.
 */
interface DiscordMessage {
    /**
     * Идентификатор сообщения.
     */
    id: string;

    /**
     * Текст сообщения.
     */
    content: string;

    /**
     * Автор сообщения.
     */
    author: {
        /**
         * Имя пользователя Discord.
         */
        username: string;

        /**
         * Глобальное имя пользователя.
         */
        global_name?: string | null;
    };

    /**
     * Дата отправки сообщения.
     */
    timestamp: string;

    /**
     * Список вложений.
     */
    attachments: DiscordAttachment[];
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
 * Сервис получения скриншотов из Discord-канала.
 *
 * Запрашивает сообщения через прокси `/discord`, который добавляет
 * авторизацию бота на стороне сервера. Возвращает только
 * изображения из вложений.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordGalleryService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Базовый URL к Discord API.
     *
     * В development и production запросы идут через локальный прокси `/discord`,
     * который добавляет токен бота на стороне сервера.
     */
    private readonly baseUrl = '/discord';

    /**
     * Идентификатор канала со скриншотами.
     */
    private readonly channelId = environment.discordScreenshotsChannelId;

    /**
     * HTTP-контекст для обхода внутренних интерцепторов.
     */
    private readonly requestContext = new HttpContext()
        .set(SKIP_AUTH, true)
        .set(SKIP_ERROR_ALERT, true);

    /**
     * Возвращает страницу изображений из канала скриншотов.
     *
     * Загружает сообщения из Discord до тех пор, пока не наберётся
     * запрошенное количество изображений или не закончатся сообщения.
     *
     * @param limit Максимальное количество изображений на странице.
     * @param before Идентификатор сообщения, перед которым нужно загружать.
     * @returns Observable со страницей изображений.
     */
    public getImages$(limit: number, before?: string): Observable<DiscordGalleryPage> {
        if (!this.channelId || !isPlatformBrowser(this.platformId)) {
            return of({ images: [], isLastPage: true });
        }

        return this.fetchPage$(limit, before).pipe(
            map((page) => ({
                images: this.mapToImages(page.messages),
                isLastPage: page.isLastPage,
            })),
            catchError((error) => {
                console.error('[DiscordGalleryService] Ошибка загрузки сообщений:', error);

                if (error.status === 403) {
                    console.error(
                        '[DiscordGalleryService] 403 Forbidden: проверьте, что dev-сервер запущен с прокси (npm start) и токен бота корректен.'
                    );
                }

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
     * Загружает сообщения из Discord, пока не наберётся нужное количество изображений.
     *
     * @param limitNeeded Сколько изображений нужно.
     * @param before Идентификатор сообщения, перед которым загружать.
     * @param accumulatedMessages Накопленные сообщения.
     * @returns Observable с сообщениями и признаком последней страницы.
     */
    private fetchPage$(
        limitNeeded: number,
        before?: string,
        accumulatedMessages: DiscordMessage[] = []
    ): Observable<{ messages: DiscordMessage[]; isLastPage: boolean }> {
        let params = new HttpParams().set('limit', `${DISCORD_PAGE_SIZE}`);

        if (before) {
            params = params.set('before', before);
        }

        return this.http
            .get<DiscordMessage[]>(`${this.baseUrl}/channels/${this.channelId}/messages`, {
                params,
                context: this.requestContext,
            })
            .pipe(
                switchMap((messages) => {
                    const combined = accumulatedMessages.concat(messages);
                    const imageCount = this.countImages(combined);

                    const noMoreMessages = messages.length === 0 || messages.length < DISCORD_PAGE_SIZE;
                    const hasEnoughImages = imageCount >= limitNeeded;

                    if (noMoreMessages || hasEnoughImages) {
                        const trimmedMessages = this.trimToImageLimit(combined, limitNeeded);

                        return of({
                            messages: trimmedMessages,
                            isLastPage:
                                noMoreMessages ||
                                this.countImages(trimmedMessages) < limitNeeded,
                        });
                    }

                    const lastId = messages[messages.length - 1].id;

                    return this.fetchPage$(limitNeeded, lastId, combined);
                })
            );
    }

    /**
     * Считает количество изображений в списке сообщений.
     *
     * @param messages Список сообщений.
     * @returns Количество изображений.
     */
    private countImages(messages: DiscordMessage[]): number {
        return messages.reduce(
            (count, message) =>
                count +
                message.attachments.filter((attachment) =>
                    attachment.content_type?.startsWith('image/')
                ).length,
            0
        );
    }

    /**
     * Обрезает сообщения так, чтобы осталось не больше нужного количества изображений.
     *
     * @param messages Список сообщений.
     * @param limit Максимальное количество изображений.
     * @returns Обрезанный список сообщений.
     */
    private trimToImageLimit(messages: DiscordMessage[], limit: number): DiscordMessage[] {
        let imageCount = 0;

        const result: DiscordMessage[] = [];

        for (const message of messages) {
            const imageAttachments = message.attachments.filter((attachment) =>
                attachment.content_type?.startsWith('image/')
            );

            if (imageCount + imageAttachments.length > limit) {
                const needed = limit - imageCount;

                if (needed <= 0) {
                    break;
                }

                result.push({
                    ...message,
                    attachments: imageAttachments.slice(0, needed),
                });
                imageCount += needed;
                break;
            }

            result.push(message);
            imageCount += imageAttachments.length;
        }

        return result;
    }

    /**
     * Преобразует сообщения Discord в элементы галереи.
     *
     * @param messages Список сообщений.
     * @returns Список изображений.
     */
    private mapToImages(messages: DiscordMessage[]): DiscordGalleryImage[] {
        return messages.flatMap((message) =>
            message.attachments
                .filter((attachment) => attachment.content_type?.startsWith('image/'))
                .map((attachment) => ({
                    id: `${message.id}-${attachment.id}`,
                    url: attachment.url,
                    proxyUrl: attachment.url,
                    alt: message.content || attachment.filename,
                    author: message.author.global_name || message.author.username,
                    timestamp: message.timestamp,
                    width: attachment.width,
                    height: attachment.height,
                }))
        );
    }
}
