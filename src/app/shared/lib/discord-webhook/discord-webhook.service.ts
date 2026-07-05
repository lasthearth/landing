import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '@core/config/environments/environment';

/**
 * Payload для Discord webhook embed.
 */
interface DiscordEmbed {
    title: string;
    description: string;
    url?: string;
    color: number;
    image?: { url: string };
    thumbnail?: { url: string };
    footer?: { text: string };
    timestamp?: string;
}

/**
 * Payload для Discord webhook.
 */
interface DiscordWebhookPayload {
    content?: string;
    embeds: DiscordEmbed[];
    username?: string;
    avatar_url?: string;
}

/**
 * Сервис отправки сообщений в Discord через webhook.
 *
 * Используется для публикации уведомлений о новых новостях
 * в канал Discord в формате rich embed.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordWebhookService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * URL Discord webhook для публикации новостей.
     *
     * Если не задан в environment, отправка не производится.
     */
    private readonly webhookUrl = environment.discordNewsWebhookUrl;

    /**
     * Отправляет rich embed о новой новости в Discord.
     *
     * Ошибки отправки не прерывают пользовательский сценарий
     * и не показываются пользователю.
     *
     * @param title Заголовок новости.
     * @param content Содержание новости (поддерживается HTML, будет очищено).
     * @param previewUrl URL превью-изображения новости.
     * @param newsUrl Прямая ссылка на новость на сайте.
     * @param author Имя автора новости.
     * @returns Observable с результатом отправки.
     */
    public sendNewsEmbed(
        title: string,
        content: string,
        previewUrl: string,
        newsUrl: string,
        author?: string
    ): Observable<void> {
        if (!this.webhookUrl) {
            return of(undefined);
        }

        const plainContent = this.stripHtml(content);
        const truncatedContent = this.truncate(plainContent, 4096);
        const truncatedTitle = this.truncate(title, 256);

        const payload: DiscordWebhookPayload = {
            username: 'Last Hearth News',
            avatar_url: `${environment.redirectUri}/images/logo.png`,
            embeds: [
                {
                    title: truncatedTitle,
                    description: truncatedContent,
                    url: newsUrl,
                    color: 0xc35a17,
                    image: previewUrl ? { url: previewUrl } : undefined,
                    footer: author ? { text: `Автор: ${author}` } : undefined,
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        return this.http.post<void>(this.webhookUrl, payload).pipe(
            catchError(() => of(undefined))
        );
    }

    /**
     * Удаляет HTML-теги из строки.
     *
     * @param html Строка с HTML-разметкой.
     * @returns Очищенный текст.
     */
    private stripHtml(html: string): string {
        if (!html) {
            return '';
        }

        const tmp = typeof document !== 'undefined' ? document.createElement('div') : null;

        if (!tmp) {
            return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Обрезает строку до указанной длины с добавлением многоточия.
     *
     * @param value Исходная строка.
     * @param max_length Максимальная длина.
     * @returns Обрезанная строка.
     */
    private truncate(value: string, maxLength: number): string {
        if (!value || value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, maxLength - 3).trim()}...`;
    }
}
