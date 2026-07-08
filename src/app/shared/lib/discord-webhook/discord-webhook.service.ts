import { Injectable, inject } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { DiscordApiService, SendDiscordNewsRequest } from '@entities/discord';

/**
 * Сервис отправки сообщений в Discord через бэкенд.
 *
 * Используется для публикации уведомлений о новых новостях
 * в канал Discord в формате rich embed.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordWebhookService {
    /**
     * API-сервис Discord.
     */
    private readonly discordApi = inject(DiscordApiService);

    /**
     * Отправляет rich embed о новой новости в Discord.
     *
     * Ошибки отправки не прерывают пользовательский сценарий
     * и не показываются пользователю.
     *
     * @param title Заголовок новости.
     * @param content Содержание новости (поддерживается HTML, будет очищено на бэкенде).
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
        const request: SendDiscordNewsRequest = {
            title,
            content,
            preview_url: previewUrl,
            news_url: newsUrl,
            author,
        };

        return this.discordApi.sendNews$(request).pipe(catchError(() => of(undefined)));
    }
}
