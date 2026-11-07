import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { concat, concatMap, Observable, of, ReplaySubject, share, take } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { LocalStorageService } from '@core/services/local-storage.service';
import { DiscordApiService, DiscordImageDto, DiscordImagesPageDto } from '@entities/discord';

/**
 * Время жизни кэша галереи в миллисекундах.
 *
 * Адреса картинок Discord подписаны и истекают примерно через сутки,
 * поэтому кэш живёт заметно меньше: пять минут покрывают переход
 * «главная → галерея», но не оставляют в localStorage мёртвые ссылки.
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
 * Предел числа страниц за один проход.
 *
 * Страховка от бесконечного цикла, если бэкенд перестанет сообщать
 * о последней странице: 40 страниц — 4000 кадров, в несколько раз больше
 * сегодняшнего архива (700 кадров на ноябрь 2026).
 */
const MAX_PAGES = 40;

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
 * Архив канала большой, поэтому страницы отдаются потоком:
 * {@link getAllImages$} выдаёт накопленный список после каждой страницы,
 * и галерея рисуется уже на первой, не дожидаясь конца архива.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordGalleryService {
    /**
     * Id сообщения в адресе CDN: `/attachments/{канал}/{сообщение}/{файл}`.
     *
     * Бэкенд присылает `id` пустой строкой для всех вложений, поэтому
     * курсор «до какого сообщения грузить» приходится читать из адреса.
     */
    private static readonly MESSAGE_ID_IN_URL = /\/attachments\/\d+\/(\d+)\//;

    /**
     * Путь вложения в адресе CDN: `{id сообщения}/{имя файла}`.
     *
     * В одном сообщении бывает несколько вложений, поэтому id сообщения
     * сам по себе не уникален: без имени файла два кадра одного поста
     * получили бы одинаковый ключ `track`.
     */
    private static readonly ATTACHMENT_PATH_IN_URL = /\/attachments\/\d+\/(\d+\/[^/?#]+)/;

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
     * Общий поток первой страницы.
     */
    private firstPage$: Observable<DiscordGalleryImage[]> | null = null;

    /**
     * Общий поток всего архива.
     */
    private allPages$: Observable<DiscordGalleryImage[]> | null = null;

    /**
     * Загружает только первую страницу — свежую сотню кадров.
     *
     * Хватает лентам-превью, которым весь архив не нужен: один запрос
     * вместо семи подряд.
     *
     * @returns Observable со списком свежих изображений.
     */
    public getFirstPage$(): Observable<DiscordGalleryImage[]> {
        if (!this.canFetch()) {
            return of([]);
        }

        this.firstPage$ ??= this.fetchPage$(undefined, [], 0).pipe(take(1), this.shareOnce());

        return this.firstPage$;
    }

    /**
     * Загружает архив канала страницами.
     *
     * Выдаёт значение после каждой страницы: сначала свежая сотня, затем
     * 200, 300 и так до конца архива. Подписчик сам решает, когда
     * отписаться, — ждать последнего кадра не обязательно.
     *
     * @returns Observable с накопленным списком изображений.
     */
    public getAllImages$(): Observable<DiscordGalleryImage[]> {
        if (!this.canFetch()) {
            return of([]);
        }

        this.allPages$ ??= this.fetchPage$(undefined, [], 0).pipe(this.shareOnce());

        return this.allPages$;
    }

    /**
     * Возвращает кэшированные изображения, если они не устарели.
     *
     * @returns Список изображений первой страницы или `null`.
     */
    public getCachedImages(): DiscordGalleryImage[] | null {
        const cache = this.localStorage.getItem<GalleryCache>(CACHE_KEY);

        if (!cache || Date.now() - cache.savedAt > CACHE_TTL) {
            return null;
        }

        return cache.images;
    }

    /**
     * Сохраняет первую страницу в локальный кэш.
     *
     * Кэшируется ровно одна страница: весь архив — это сотни килобайт
     * JSON в localStorage ради первых экранов, которые и так приходят
     * одним запросом.
     *
     * @param images Список изображений.
     */
    public saveCache(images: DiscordGalleryImage[]): void {
        this.localStorage.setItem(CACHE_KEY, {
            savedAt: Date.now(),
            images: images.slice(0, DISCORD_MAX_LIMIT),
        });
    }

    /**
     * Проверяет, что запрос вообще имеет смысл.
     *
     * На сервере запросов нет: адреса картинок подписаны и истекают,
     * поэтому в пререндер они легли бы мёртвыми.
     *
     * @returns true, если можно обращаться к API.
     */
    private canFetch(): boolean {
        return Boolean(this.channelId) && isPlatformBrowser(this.platformId);
    }

    /**
     * Делит поток так, чтобы повторные подписки не запускали новые запросы.
     *
     * `shareReplay` здесь нельзя: он кэширует и ошибку, и после одного сбоя
     * галерея оставалась сломанной до перезагрузки страницы (`docs/TRAPS.md`).
     * `resetOnError` сбрасывает соединение, поэтому повтор грузит заново.
     *
     * @returns Оператор общего доступа к потоку.
     */
    private shareOnce() {
        return share<DiscordGalleryImage[]>({
            connector: () => new ReplaySubject<DiscordGalleryImage[]>(1),
            resetOnError: true,
            resetOnComplete: false,
            resetOnRefCountZero: false,
        });
    }

    /**
     * Загружает страницу и идёт дальше, выдавая накопленный список.
     *
     * @param before Идентификатор сообщения, перед которым нужно загружать.
     * @param accumulated Накопленный список изображений.
     * @param depth Номер текущей страницы, от нуля.
     * @returns Observable с накопленным списком после каждой страницы.
     */
    private fetchPage$(
        before: string | undefined,
        accumulated: DiscordGalleryImage[],
        depth: number
    ): Observable<DiscordGalleryImage[]> {
        return this.discordApi.getImages$(this.channelId, DISCORD_MAX_LIMIT, before).pipe(
            concatMap((page: DiscordImagesPageDto) => {
                const mapped = page.images.map((image: DiscordImageDto) => this.mapImage(image));
                const all = accumulated.concat(mapped);
                const cursor = this.extractCursor(page.images, before);
                const isLastPage = page.is_last_page || mapped.length === 0 || !cursor || depth + 1 >= MAX_PAGES;

                if (isLastPage) {
                    return of(all);
                }

                return concat(of(all), this.fetchPage$(cursor, all, depth + 1));
            })
        );
    }

    /**
     * Достаёт курсор следующей страницы из ответа бэкенда.
     *
     * Идёт от последнего кадра к первому: страница упорядочена от новых
     * к старым, а `before` ждёт id самого старого сообщения в пачке.
     * Совпадение с предыдущим курсором означает, что бэкенд вернул ту же
     * страницу, — такой курсор брать нельзя, иначе цикл не остановится.
     *
     * @param images Список DTO изображений страницы.
     * @param previous Курсор, которым запрашивали эту страницу.
     * @returns Id сообщения или `undefined`, если курсор не найден.
     */
    private extractCursor(images: DiscordImageDto[], previous: string | undefined): string | undefined {
        for (let i = images.length - 1; i >= 0; i--) {
            const fromId = images[i].id?.split('-')[0];

            if (fromId && fromId !== previous) {
                return fromId;
            }

            const fromUrl = images[i].url?.match(DiscordGalleryService.MESSAGE_ID_IN_URL)?.[1];

            if (fromUrl && fromUrl !== previous) {
                return fromUrl;
            }
        }

        return undefined;
    }

    /**
     * Преобразует DTO изображения Discord в элемент галереи.
     *
     * @param image DTO изображения.
     * @returns Элемент галереи.
     */
    private mapImage(image: DiscordImageDto): DiscordGalleryImage {
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
     * Берёт из адреса CDN пару «id сообщения + имя файла»: id сообщения
     * общий у всех вложений поста, и без имени файла два кадра из одного
     * сообщения получили бы один ключ. Если адрес нестандартный,
     * откатывается на метку времени.
     *
     * @param url URL изображения.
     * @param timestamp Дата публикации.
     * @returns Строковый идентификатор.
     */
    private buildFallbackId(url: string, timestamp: string): string {
        const attachmentPath = url?.match(DiscordGalleryService.ATTACHMENT_PATH_IN_URL)?.[1];

        return attachmentPath ?? `${timestamp}:${url}`;
    }
}
