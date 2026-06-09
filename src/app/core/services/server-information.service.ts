import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from '../config/environments/environment';
import type { ILeaderBoard } from '@entities/user';

/**
 * API-сервис для получения публичной информации о сервере.
 *
 * Предоставляет данные об онлайне, игровом времени
 * и таблице лидеров.
 */
@Injectable({
    providedIn: 'root',
})
export class ServerInformationService {
    /**
     * Базовый URL API.
     */
    private baseUrl = environment.apiUrl;

    /**
     * HTTP-клиент Angular.
     */
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Получает количество игроков онлайн.
     *
     * @returns Observable с данными об онлайне и максимальном онлайне.
     */
    public getOnlinePlayersCount$(): Observable<{ online: number; max_online: number }> {
        return this.http.get<{ online: number; max_online: number }>(`${this.baseUrl}/serverinfo/totalonline`);
    }

    /**
     * Получает текущее игровое время сервера.
     *
     * @returns Observable с игровым временем.
     */
    public getTime$(): Observable<{ time: string }> {
        return this.http.get<{ time: string }>(`${this.baseUrl}/serverinfo/worldtime`);
    }

    /**
     * Получает таблицу лидеров.
     *
     * @param type Тип таблицы лидеров (0 — смерти, 1 — убийства, 2 — часы).
     * @returns Observable с записями таблицы лидеров.
     */
    public getLeaderBoard(type: number = 0): Observable<{ entries: Array<ILeaderBoard> }> {
        const params = new HttpParams().set('filter', type.toString()).set('limit', '25');

        return this.http.get<{ entries: Array<ILeaderBoard> }>(`${this.baseUrl}/leaderboard`, { params });
    }

    /**
     * Получает индивидуальную статистику игрока из лидерборда.
     *
     * Запрашивает топ-200 записей и ищет игрока по имени.
     *
     * @param name Игровое имя игрока.
     * @returns Observable со статистикой игрока или `null` если не найден.
     */
    public getPlayerStats$(name: string): Observable<ILeaderBoard | null> {
        const params = new HttpParams().set('filter', '0').set('limit', '200');

        return this.http.get<{ entries: Array<ILeaderBoard> }>(`${this.baseUrl}/leaderboard`, { params }).pipe(
            map((response: { entries: Array<ILeaderBoard> }) =>
                response.entries.find((entry: ILeaderBoard) => entry.name === name) ?? null
            )
        );
    }
}
