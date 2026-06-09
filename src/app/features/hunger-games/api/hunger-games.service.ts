import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Информация о сезоне голодных игр.
 */
export interface ISeasonInfo {
    id: string;
    number: number;
    started_at: string;
    ended_at?: string;
}

/**
 * Запись текущего лидерборда голодных игр.
 *
 * Соответствует ответу GET /v1/hungergames/leaderboard.
 */
export interface ILeaderboardEntry {
    name: string;
    deaths: number;
    kills: number;
    hours_played: number;
    user_id: string;
}

/**
 * Статистика игрока в сезоне голодных игр.
 */
export interface IPlayerSeasonStats {
    player_id: string;
    player_name: string;
    elo: number;
    wins: number;
    kills: number;
    rank: number;
    reward_coins: string;
}

/**
 * API-сервис для работы с голодными играми.
 */
@Injectable({
    providedIn: 'root',
})
export class HungerGamesService {
    private readonly baseUrl = environment.apiUrl;
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Получает текущий активный сезон голодных игр.
     *
     * Определяет активный сезон как первый сезон без даты окончания
     * из списка всех сезонов.
     */
    public getCurrentSeason$(): Observable<ISeasonInfo | null> {
        return this.http
            .get<{ seasons: ISeasonInfo[] }>(`${this.baseUrl}/hungergames/seasons`)
            .pipe(
                map((response) => {
                    const list = response.seasons ?? [];
                    const active = list.find((s) => !s.ended_at);
                    return active ?? null;
                }),
                catchError(() => of(null))
            );
    }

    /**
     * Получает список всех сезонов (история), новейшие первыми.
     */
    public getSeasons$(): Observable<ISeasonInfo[]> {
        return this.http
            .get<{ seasons: ISeasonInfo[] }>(`${this.baseUrl}/hungergames/seasons`)
            .pipe(
                map((response) => response.seasons ?? []),
                catchError(() => of([]))
            );
    }

    /**
     * Получает текущий лидерборд голодных игр.
     */
    public getLeaderboard$(): Observable<{ entries: ILeaderboardEntry[] }> {
        return this.http.get<{ entries: ILeaderboardEntry[] }>(
            `${this.baseUrl}/hungergames/leaderboard`
        );
    }

    /**
     * Получает статистику игрока в указанном сезоне.
     *
     * @param seasonId Идентификатор сезона.
     * @param playerId Идентификатор игрока.
     */
    public getPlayerSeasonStats$(seasonId: string, playerId: string): Observable<IPlayerSeasonStats | null> {
        return this.http
            .get<{ stats: IPlayerSeasonStats }>(
                `${this.baseUrl}/hungergames/seasons/${seasonId}/players/${playerId}`,
                { context: new HttpContext().set(SKIP_ERROR_ALERT, true) }
            )
            .pipe(
                map((response) => response.stats ?? null),
                catchError(() => of(null))
            );
    }
}
