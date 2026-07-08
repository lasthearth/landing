import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, of, switchMap, timer } from 'rxjs';
import { SKIP_AUTH } from '@core/interceptors/auth.interceptor';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { LocalStorageService } from '@core/services/local-storage.service';
import {
    GameChatMessage,
    GameChatMessageType,
    GameChatPage,
} from '@features/game-chat/model/game-chat-message';
import { replaceDiscordEmojis } from '@features/game-chat/lib/discord-emoji';

/**
 * Количество сообщений, запрашиваемых за один раз из Discord.
 */
const DISCORD_PAGE_SIZE = 100;

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
}

/**
 * Список Markdown-заголовков, которые могут прийти из Discord.
 */
const MARKDOWN_HEADER_PATTERN = /^#{1,6}\s+/gm;

/**
 * Очищает текст сообщения от Discord-разметки Markdown.
 *
 * Убирает заголовки, жирный/курсив (`*`, `_`), зачёркивание (`~~`), моноширинный текст
 * (``` ... ```, ` ... `), спойлеры (`||`), цитаты (`>`), ссылки `[text](url)`,
 * экранированные символы (`\`) и лишние пустые строки.
 *
 * @param content Исходный текст.
 * @returns Очищенный текст.
 */
function cleanContent(content: string): string {
    return (
        content
            // Заголовки # ... ######
            .replace(MARKDOWN_HEADER_PATTERN, '')
            // Блоки кода ``` ... ```
            .replace(/```[\s\S]*?```/g, '')
            // Строчный код ` ... `
            .replace(/`[^`]*`/g, '')
            // Спойлеры ||text||
            .replace(/\|\|[\s\S]*?\|\|/g, '')
            // Зачёркивание ~~text~~
            .replace(/~~(.*?)~~/g, '$1')
            // Жирный/курсив ***text***, **text**, *text*, ___text___, __text__, _text_
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
            .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
            // Ссылки [text](url) и автоссылки <url>
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/<(https?:\/\/[^>]+)>/g, '$1')
            // Цитаты в начале строки
            .replace(/^\s*>{1,3}\s?/gm, '')
            // Экранирование Markdown: \*, \_, \~, \`, \|, \\, \[ и т.д.
            .replace(/\\([*_~`|\[\]()<>#+\-=.!{}])/g, '$1')
            // Сжимаем повторяющиеся пустые строки до одной
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
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
 * Загружает сообщения из Discord-канала, в который бот ретранслирует
 * игровой чат сервера. Поддерживает кэширование и периодический polling.
 */
@Injectable({
    providedIn: 'root',
})
export class GameChatService {
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
     * HTTP-контекст для обхода внутренних интерцепторов.
     */
    private readonly requestContext = new HttpContext()
        .set(SKIP_AUTH, true)
        .set(SKIP_ERROR_ALERT, true);

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
     * Загружает страницу сообщений из Discord-канала.
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

        let params = new HttpParams().set('limit', `${Math.min(limit, DISCORD_PAGE_SIZE)}`);

        if (before) {
            params = params.set('before', before);
        }

        return this.http
            .get<DiscordMessage[]>(`${this.getBaseUrl()}/channels/${channelId}/messages`, {
                params,
                context: this.requestContext,
            })
            .pipe(
                map((messages) => ({
                    messages: messages.map((message) => this.mapMessage(message)),
                    isLastPage: messages.length < DISCORD_PAGE_SIZE,
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
     * Преобразует сообщение Discord в сообщение игрового чата.
     *
     * @param message Сообщение Discord.
     * @returns Сообщение игрового чата.
     */
    private mapMessage(message: DiscordMessage): GameChatMessage {
        const { content, type } = this.parseContent(message.content);

        return {
            id: message.id,
            content: replaceDiscordEmojis(cleanContent(content)),
            author: message.author.global_name || message.author.username,
            timestamp: message.timestamp,
            type,
        };
    }

    /**
     * Определяет тип сообщения по его содержимому.
     *
     * @param content Исходный текст сообщения.
     * @returns Обработанный текст и тип сообщения.
     */
    private parseContent(content: string): { content: string; type: GameChatMessageType } {
        const trimmed = content.trim();

        if (trimmed.startsWith('[')) {
            const endIndex = trimmed.indexOf(']');

            if (endIndex !== -1) {
                const prefix = trimmed.slice(1, endIndex).toLowerCase();
                const text = trimmed.slice(endIndex + 1).trim();

                if (prefix.includes('global') || prefix.includes('глобал')) {
                    return { content: text, type: 'global' };
                }

                if (prefix.includes('local') || prefix.includes('локал')) {
                    return { content: text, type: 'local' };
                }

                if (prefix.includes('server') || prefix.includes('сервер')) {
                    return { content: text, type: 'server' };
                }

                if (prefix.includes('event') || prefix.includes('событие')) {
                    return { content: text, type: 'event' };
                }

                return { content: text, type: 'unknown' };
            }
        }

        return { content: trimmed, type: 'global' };
    }

    /**
     * Возвращает базовый URL для запросов к Discord API.
     */
    private getBaseUrl(): string {
        return '/discord';
    }
}
