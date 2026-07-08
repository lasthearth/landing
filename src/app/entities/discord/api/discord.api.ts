import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import {
    DiscordImagesPageDto,
    DiscordMessagesPageDto,
    SendDiscordNewsRequest,
} from '../model/discord.types';

/**
 * API-сервис для работы с Discord-данными через бэкенд.
 *
 * Заменяет прямое обращение фронтенда к Discord API.
 */
@Injectable({
    providedIn: 'root',
})
export class DiscordApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Возвращает страницу сообщений из Discord-канала.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество сообщений.
     * @param before Идентификатор сообщения, перед которым загружать.
     * @returns Observable со страницей сообщений.
     */
    public getMessages$(
        channelId: string,
        limit: number = 50,
        before?: string
    ): Observable<DiscordMessagesPageDto> {
        let params = new HttpParams().set('limit', `${limit}`);

        if (before) {
            params = params.set('before', before);
        }

        return this.http.get<DiscordMessagesPageDto>(
            `${this.baseUrl}/discord/channels/${channelId}/messages`,
            { params }
        );
    }

    /**
     * Возвращает страницу изображений из Discord-канала.
     *
     * @param channelId Идентификатор Discord-канала.
     * @param limit Максимальное количество изображений.
     * @param before Идентификатор сообщения, перед которым загружать.
     * @returns Observable со страницей изображений.
     */
    public getImages$(
        channelId: string,
        limit: number = 20,
        before?: string
    ): Observable<DiscordImagesPageDto> {
        let params = new HttpParams().set('limit', `${limit}`);

        if (before) {
            params = params.set('before', before);
        }

        return this.http.get<DiscordImagesPageDto>(
            `${this.baseUrl}/discord/channels/${channelId}/images`,
            { params }
        );
    }

    /**
     * Отправляет rich embed новости в Discord.
     *
     * @param request Данные для публикации.
     * @returns Observable с пустым результатом.
     */
    public sendNews$(request: SendDiscordNewsRequest): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/discord/news`, request);
    }
}
