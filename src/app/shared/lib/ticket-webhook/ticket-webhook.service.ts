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
    color: number;
    fields?: { name: string; value: string; inline?: boolean }[];
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
 * Сервис отправки тикетов в Discord через webhook.
 *
 * Используется для публикации обращений игроков
 * в канал администрации в красивом формате embed.
 */
@Injectable({
    providedIn: 'root',
})
export class TicketWebhookService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * URL Discord webhook для публикации тикетов.
     *
     * Если не задан в environment, отправка не производится.
     */
    private readonly webhookUrl = environment.discordTicketWebhookUrl;

    /**
     * Отправляет embed с тикетом в Discord.
     *
     * Ошибки отправки не прерывают пользовательский сценарий
     * и не показываются пользователю.
     *
     * @param discordTag Тег пользователя в Discord.
     * @param gameNickname Никнейм пользователя в игре.
     * @param reason Текст обращения.
     * @param siteUserId Идентификатор пользователя на сайте.
     * @param siteUsername Имя пользователя на сайте.
     * @returns Observable с результатом отправки.
     */
    public sendTicket(
        discordTag: string,
        gameNickname: string,
        reason: string,
        date: string,
        siteUserId: string,
        siteUsername: string
    ): Observable<void> {
        if (!this.webhookUrl) {
            return of(undefined);
        }

        const description = [
            '🎫 **Новое обращение**',
            '',
            `**Discord:** \`${discordTag}\``,
            `**Ник в игре:** \`${gameNickname}\``,
            `**Дата:** \`${date}\``,
            `**ID на сайте:** \`${siteUserId}\``,
            `**Ник на сайте:** \`${siteUsername}\``,
            '',
            '---',
            '',
            '**📝 Причина обращения:**',
            reason,
        ].join('\n');

        const payload: DiscordWebhookPayload = {
            username: 'Last Hearth Tickets',
            avatar_url: `${environment.redirectUri}/images/logo.png`,
            content: `🎫 **Новое обращение от <@${discordTag}>**`,
            embeds: [
                {
                    title: 'Новое обращение',
                    description,
                    color: 0xc35a17,
                    footer: { text: 'Last Hearth Landing' },
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        return this.http.post<void>(this.webhookUrl, payload).pipe(
            catchError(() => of(undefined))
        );
    }
}
