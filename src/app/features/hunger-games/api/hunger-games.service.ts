import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { Observable } from 'rxjs';

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
 * Запись лидерборда голодных игр.
 */
export interface ISeasonResultEntry {
    player_id: string;
    player_name: string;
    elo: number;
    wins: number;
    kills: number;
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
    matches_played: number;
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
     */
    public getCurrentSeason$(): Observable<ISeasonInfo> {
        return this.http.get<ISeasonInfo>(`${this.baseUrl}/hungergames/season`);
    }

    /**
     * Получает текущий лидерборд голодных игр.
     */
    public getLeaderboard$(): Observable<{ entries: ISeasonResultEntry[] }> {
        return this.http.get<{ entries: ISeasonResultEntry[] }>(`${this.baseUrl}/hungergames/leaderboard`);
    }

    /**
     * Получает статистику игрока в указанном сезоне.
     *
     * @param seasonId Идентификатор сезона.
     * @param playerId Идентификатор игрока.
     */
    public getPlayerSeasonStats$(seasonId: string, playerId: string): Observable<IPlayerSeasonStats> {
        return this.http.get<IPlayerSeasonStats>(
            `${this.baseUrl}/hungergames/seasons/${seasonId}/players/${playerId}`
        );
    }
}
