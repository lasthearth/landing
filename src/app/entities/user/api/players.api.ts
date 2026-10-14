import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { toPlayersApiParams } from '../lib/players-api-params.function';
import { IPlayer } from '../model/i-player';
import { PlayerListItem, PlayersPage } from '../model/players-page';
import { PlayerListItemDto, PlayersPageDto } from '../model/players.dto';
import { PlayersQuery } from '../model/players-query';

/**
 * API игроков: своё описание «О себе», его скрытие модератором и список игроков.
 *
 * Отдельно от {@link UserService}: тот отвечает за вход в систему и текущего
 * пользователя, а здесь — открытые данные списка и описание профиля.
 */
@Injectable({ providedIn: 'root' })
export class PlayersApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Сохраняет описание «О себе» текущего игрока.
     *
     * @param about Новый текст описания; пустая строка удаляет описание.
     * @returns Обновлённый игрок с полями `about` и `about_updated_at`.
     */
    public updateMyAbout$(about: string): Observable<IPlayer> {
        return this.http.put<IPlayer>(`${this.baseUrl}/users/me/about`, { about });
    }

    /**
     * Скрывает описание игрока.
     *
     * @param userId Идентификатор игрока.
     * @param reason Причина — её увидит игрок.
     * @returns Observable без значения.
     */
    public hideAbout$(userId: string, reason: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/users/${userId}/about:hide`, { reason });
    }

    /**
     * Список игроков: поиск, фильтр «был в игре», сортировка и страницы.
     *
     * Ошибку показывает сама страница (`SKIP_ERROR_ALERT`): у неё своё
     * состояние с кнопкой «Повторить».
     *
     * @param query Запрос списка игроков.
     * @returns Страница игроков со счётчиками фильтров.
     */
    public list$(query: PlayersQuery): Observable<PlayersPage> {
        return this.http
            .get<PlayersPageDto>(`${this.baseUrl}/players`, {
                params: toPlayersApiParams(query),
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((response) => this.mapPage(response, query)));
    }

    /**
     * Собирает страницу игроков из ответа сервера.
     *
     * @param response Ответ `GET /players`.
     * @param requested Запрос, на который отвечает сервер.
     * @returns Страница для экрана.
     */
    private mapPage(response: PlayersPageDto, requested: PlayersQuery): PlayersPage {
        const players = (response.players ?? []).map((item) => this.mapItem(item));
        const total = this.toNumber(response.total, players.length);
        const counts = response.counts;

        return {
            players,
            total,
            page: this.toNumber(response.page, requested.page),
            pageSize: this.toNumber(response.page_size, requested.pageSize),
            counts: {
                all: this.toNumber(counts?.all, total),
                online: this.toNumber(counts?.online, 0),
                day: this.toNumber(counts?.day, 0),
                week: this.toNumber(counts?.week, 0),
                month: this.toNumber(counts?.month, 0),
                inactive: this.toNumber(counts?.inactive, 0),
            },
        };
    }

    /**
     * Приводит игрока из выдачи к модели экрана.
     *
     * @param item Игрок в ответе сервера.
     * @returns Игрок для карточки.
     */
    private mapItem(item: PlayerListItemDto): PlayerListItem {
        return {
            userId: item.user_id,
            nickname: item.nickname || item.user_game_name || '',
            avatarUrl:
                item.avatar?.original || item.avatar?.x96 || item.avatar?.x48 || '/default-avatar.webp',
            isOnline: !!item.is_online,
            lastOnline: item.last_online || null,
            hours: this.toNumber(item.hours_played, 0),
            about: item.about ?? '',
        };
    }

    /**
     * Приводит число из ответа сервера к числу.
     *
     * @param value Значение (сервер может отдать строкой).
     * @param fallback Значение, если пришло пусто или мусор.
     * @returns Число.
     */
    private toNumber(value: number | string | null | undefined, fallback: number): number {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : fallback;
    }
}
