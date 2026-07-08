import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, of, shareReplay, switchMap, timer } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';
import {
    DiscordApiService,
    DiscordMessageDto,
    DiscordMessagesPageDto,
} from '@entities/discord';
import {
    GameChatMessage,
    GameChatPage,
} from '@features/game-chat/model/game-chat-message';

/**
 * Период обновления чата в миллисекундах.
 */
const POLLING_INTERVAL = 15_000;

/**
 * Время жизни кэша чата в миллисекундах.
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Префикс ключа для хранения кэша чата в localStorage.
 */
const CACHE_KEY_PREFIX = 'lh_game_chat_cache_';

/**
 * Записи кэша чата.
 */
interface ChatCache {
    /**
     * Дата сохранения кэша.
     */
    savedAt: number;

    /**
     * Сохранённые сообщения.
     */
    messages: GameChatMessage[];
}

/**
 * Возвращает ключ кэша для указанного канала.
 *
 * @param channelId Идентификатор канала.
 * @returns Ключ localStorage.
 */
function getCacheKey(channelId: string): string {
    return `${CACHE_KEY_PREFIX}${channelId}`;
}

/**
 * Сервис игрового чата.
 *
 * Загружает сообщения из Discord-канала через бэкенд.
 * Поддерживает кэширование и периодический polling.
 */
@Injectable({
    providedIn: 'root',
})
export class GameChatService {
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
     * Кэш активных polling-потоков по каналам.
     * Позволяет избежать дублирования HTTP-запросов, когда несколько
     * подписчиков слушают один и тот же канал.
     */
    private readonly activeStreams = new Map<string, Observable<GameChatMessage[]>>();

    /**
     * Возвращает поток обновлений Discord-канала.
     *
     * При подписке сразу возвращает кэшированные сообщения (если они есть
     * и не устарели), затем начинает периодический polling свежих сообщений.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество сообщений.
     * @returns Observable со списком сообщений.
     */
    public watchChat$(channelId: string, limit: number = 50): Observable<GameChatMessage[]> {
        if (!isPlatformBrowser(this.platformId) || !channelId) {
            return of([]);
        }

        const streamKey = `${channelId}:${limit}`;
        const cachedStream = this.activeStreams.get(streamKey);

        if (cachedStream) {
            return cachedStream;
        }

        const stream = timer(0, POLLING_INTERVAL).pipe(
            switchMap(() => this.fetchMessages$(channelId, limit)),
            map((page) => {
                this.saveCache(channelId, page.messages);

                return page.messages;
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        this.activeStreams.set(streamKey, stream);

        return stream;
    }

    /**
     * Загружает все сообщения из Discord-канала.
     *
     * Рекурсивно дозагружает страницы до последней, чтобы на странице
     * дипломатии отображались все заявления, а не только первая страница.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество сообщений на страницу.
     * @returns Observable со списком всех сообщений.
     */
    public fetchAllMessages$(channelId: string, limit: number = 100): Observable<GameChatMessage[]> {
        if (!isPlatformBrowser(this.platformId) || !channelId) {
            return of([]);
        }

        return this.fetchMessagesRecursive$(channelId, limit, undefined, []);
    }

    /**
     * Рекурсивно загружает страницы сообщений.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество сообщений на страницу.
     * @param before Идентификатор сообщения, перед которым загружать.
     * @param accumulated Накопленный список сообщений.
     * @returns Observable со списком всех сообщений.
     */
    private fetchMessagesRecursive$(
        channelId: string,
        limit: number,
        before: string | undefined,
        accumulated: GameChatMessage[]
    ): Observable<GameChatMessage[]> {
        return this.discordApi.getMessages$(channelId, limit, before).pipe(
            switchMap((page: DiscordMessagesPageDto) => {
                const messages = page.messages.map((message: DiscordMessageDto) => this.mapMessage(message));
                const allMessages = accumulated.concat(messages);

                if (page.is_last_page || messages.length === 0) {
                    return of(allMessages);
                }

                const lastMessage = page.messages[messages.length - 1];
                const lastMessageId = lastMessage?.id;

                if (!lastMessageId) {
                    return of(allMessages);
                }

                return this.fetchMessagesRecursive$(channelId, limit, lastMessageId, allMessages);
            })
        );
    }

    /**
     * Загружает страницу сообщений из Discord-канала через бэкенд.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество сообщений.
     * @param before Идентификатор сообщения, перед которым загружать.
     * @returns Observable со страницей сообщений.
     */
    public fetchMessages$(
        channelId: string,
        limit: number = 50,
        before?: string
    ): Observable<GameChatPage> {
        if (!channelId || !isPlatformBrowser(this.platformId)) {
            return of({ messages: [], isLastPage: true });
        }

        return this.discordApi.getMessages$(channelId, limit, before).pipe(
            map((page: DiscordMessagesPageDto) => ({
                messages: page.messages.map((message: DiscordMessageDto) => this.mapMessage(message)),
                isLastPage: page.is_last_page,
            }))
        );
    }

    /**
     * Возвращает кэшированные сообщения, если они не устарели.
     *
     * @param channelId Идентификатор Discord-канала.
     * @returns Список сообщений или `null`.
     */
    public getCachedMessages(channelId: string): GameChatMessage[] | null {
        const cache = this.localStorage.getItem<ChatCache>(getCacheKey(channelId));

        if (!cache || Date.now() - cache.savedAt > CACHE_TTL) {
            return null;
        }

        return cache.messages;
    }

    /**
     * Сохраняет сообщения в локальный кэш.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param messages Список сообщений.
     */
    private saveCache(channelId: string, messages: GameChatMessage[]): void {
        this.localStorage.setItem(getCacheKey(channelId), {
            savedAt: Date.now(),
            messages,
        });
    }

    /**
     * Преобразует DTO сообщения Discord в сообщение игрового чата.
     *
     * @param message DTO сообщения Discord.
     * @returns Сообщение игрового чата.
     */
    private mapMessage(message: {
        id: string;
        content: string;
        author_name: string;
        timestamp: string;
        type: string;
    }): GameChatMessage {
        const generatedId = message.id || this.generateMessageId(message);

        return {
            id: generatedId,
            content: message.content,
            author: message.author_name,
            timestamp: message.timestamp,
            type: message.type as GameChatMessage['type'],
        };
    }

    /**
     * Генерирует стабильный ID сообщения из его содержимого.
     *
     * Используется как fallback, если бэкенд не вернул id.
     *
     * @param message Сообщение без id.
     * @returns Стабильный строковый id.
     */
    private generateMessageId(message: {
        content: string;
        author_name: string;
        timestamp: string;
    }): string {
        const raw = `${message.timestamp}:${message.author_name}:${message.content}`;
        let hash = 0;

        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }

        return `msg-${hash.toString(16)}`;
    }
}
