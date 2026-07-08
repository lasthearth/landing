import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, of, switchMap, timer } from 'rxjs';
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

        return timer(0, POLLING_INTERVAL).pipe(
            switchMap(() => this.fetchMessages$(channelId, limit)),
            map((page) => {
                this.saveCache(channelId, page.messages);

                return page.messages;
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
        return {
            id: message.id,
            content: message.content,
            author: message.author_name,
            timestamp: message.timestamp,
            type: message.type as GameChatMessage['type'],
        };
    }
}
