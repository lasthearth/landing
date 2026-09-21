import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from '../config/environments/environment';
import { SKIP_ERROR_ALERT } from '../interceptors/error.interceptor';
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
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), шапка деградирует к прочерку.
     *
     * @returns Observable с данными об онлайне и максимальном онлайне.
     */
    public getOnlinePlayersCount$(): Observable<{ online: number; max_online: number }> {
        return this.http.get<{ online: number; max_online: number }>(`${this.baseUrl}/serverinfo/totalonline`, {
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Получает текущее игровое время сервера.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), шапка деградирует к прочерку.
     *
     * @returns Observable с игровым временем.
     */
    public getTime$(): Observable<{ time: string }> {
        return this.http.get<{ time: string }>(`${this.baseUrl}/serverinfo/worldtime`, {
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Получает таблицу лидеров.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), страница статистики деградирует к пустой таблице.
     *
     * @param type Тип таблицы лидеров (0 — смерти, 1 — убийства, 2 — часы).
     * @returns Observable с записями таблицы лидеров.
     */
    public getLeaderBoard(type: number = 0): Observable<{ entries: Array<ILeaderBoard> }> {
        const params = new HttpParams().set('filter', type.toString()).set('limit', '25');

        return this.http.get<{ entries: Array<ILeaderBoard> }>(`${this.baseUrl}/leaderboard`, {
            params,
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Получает индивидуальную статистику игрока из лидерборда.
     *
     * Запрашивает топ-200 записей и ищет игрока по имени.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), потребитель деградирует к `null`.
     *
     * @param name Игровое имя игрока.
     * @returns Observable со статистикой игрока или `null` если не найден.
     */
    public getPlayerStats$(name: string): Observable<ILeaderBoard | null> {
        const params = new HttpParams().set('filter', '0').set('limit', '200');

        return this.http
            .get<{ entries: Array<ILeaderBoard> }>(`${this.baseUrl}/leaderboard`, {
                params,
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map((response: { entries: Array<ILeaderBoard> }) =>
                    response.entries.find((entry: ILeaderBoard) => entry.name === name) ?? null
                )
            );
    }
}
