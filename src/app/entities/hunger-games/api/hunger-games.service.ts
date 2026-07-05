import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '@core/config/environments/environment';

import { ISeasonInfo, ISeasonInfoDto } from '../model/season-info.interface';
import {
    ISeasonResultEntry,
    ISeasonResultEntryDto,
} from '../model/season-result-entry.interface';
import {
    IMatchPlayer,
    IMatchResultRequestDto,
} from '../model/match-result-request.interface';
import {
    mapDtoToSeasonInfo,
    mapDtoToSeasonResultEntry,
    mapMatchPlayerToDto,
} from '../model/hunger-games.mapper';

/**
 * API-сервис для работы с Hunger Games.
 *
 * Предоставляет методы для управления сезонами, записи результатов матчей
 * и получения лидербордов.
 *
 * Административные операции (создание/сброс сезона, запись матча)
 * требуют соответствующих прав и авторизуются через authInterceptor.
 */
@Injectable({
    providedIn: 'root',
})
export class HungerGamesService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Кэшированный Observable текущего активного сезона.
     *
     * Текущий сезон определяется как первый сезон без даты окончания
     * из списка всех сезонов, отсортированных по убыванию номера.
     */
    private readonly currentSeason$ = this.http
        .get<{ seasons: ISeasonInfoDto[] }>(`${this.baseUrl}/hungergames/seasons`)
        .pipe(
            map((response) => {
                const active = response.seasons.find((s) => !s.ended_at);
                return active ? mapDtoToSeasonInfo(active) : null;
            }),
            catchError(() => of(null)),
            shareReplay(1)
        );

    /**
     * Получает информацию о текущем активном сезоне.
     *
     * @returns Observable с текущим сезоном или `null` при ошибке.
     */
    public getCurrentSeason$(): Observable<ISeasonInfo | null> {
        return this.currentSeason$;
    }

    /**
     * Получает список всех сезонов (история).
     *
     * @returns Observable с массивом сезонов.
     */
    public getSeasons$(): Observable<ISeasonInfo[]> {
        return this.http
            .get<{ seasons: ISeasonInfoDto[] }>(`${this.baseUrl}/hungergames/seasons`)
            .pipe(
                map((response) => response.seasons.map(mapDtoToSeasonInfo)),
                catchError(() => of([]))
            );
    }

    /**
     * Создаёт новый сезон Hunger Games.
     *
     * ⚠️ Требуются права администратора.
     *
     * @returns Observable с информацией о созданном сезоне.
     */
    public createSeason$(): Observable<ISeasonInfo> {
        return this.http
            .post<ISeasonInfoDto | { season: ISeasonInfoDto }>(`${this.baseUrl}/hungergames/season`, {})
            .pipe(
                map((response) => {
                    const dto = 'season' in response ? response.season : response;
                    return mapDtoToSeasonInfo(dto);
                })
            );
    }

    /**
     * Сбрасывает текущий сезон Hunger Games, распределяя награды.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param rewards Список наград по местам.
     * @returns Observable с результатом операции.
     */
    public resetSeason$(rewards: { rank: number; coins: string }[]): Observable<unknown> {
        return this.http.post<unknown>(`${this.baseUrl}/hungergames/season/reset`, { rewards });
    }

    /**
     * Записывает результат матча и пересчитывает ELO участников.
     *
     * ⚠️ Требуется активный сезон. Требуются права администратора.
     *
     * @param players Список участников матча с местами и убийствами.
     * @returns Observable с результатом операции.
     */
    public recordMatch$(players: IMatchPlayer[]): Observable<unknown> {
        const body: IMatchResultRequestDto = {
            players: players.map(mapMatchPlayerToDto),
        };

        return this.http.post<unknown>(`${this.baseUrl}/hungergames/match`, body);
    }

    /**
     * Получает текущий лидерборд активного сезона.
     *
     * @returns Observable с записями лидерборда.
     */
    public getLeaderboard$(): Observable<ISeasonResultEntry[]> {
        return this.http
            .get<{ entries: ISeasonResultEntryDto[] }>(
                `${this.baseUrl}/hungergames/leaderboard`
            )
            .pipe(
                map((response) => response.entries.map(mapDtoToSeasonResultEntry)),
                catchError(() => of([]))
            );
    }

    /**
     * Получает лидерборд указанного сезона.
     *
     * @param seasonId Идентификатор сезона.
     * @returns Observable с записями лидерборда.
     */
    public getSeasonLeaderboard$(seasonId: string): Observable<ISeasonResultEntry[]> {
        return this.http
            .get<{ entries: ISeasonResultEntryDto[] }>(
                `${this.baseUrl}/hungergames/seasons/${seasonId}/leaderboard`
            )
            .pipe(
                map((response) => response.entries.map(mapDtoToSeasonResultEntry)),
                catchError(() => of([]))
            );
    }
}
