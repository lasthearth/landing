import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import {
    catchError,
    defer,
    EMPTY,
    forkJoin,
    map,
    Observable,
    shareReplay,
    Subscription,
} from 'rxjs';
import { environment } from '../config/environments/environment';
import { SKIP_ERROR_ALERT } from '../interceptors/error.interceptor';
import type { ILeaderBoard } from '@entities/user';

/**
 * Имя кадра SSE с состоянием сервера.
 */
const SERVER_INFO_EVENT = 'serverinfo';

/**
 * Путь SSE-потока состояния сервера.
 */
const SERVER_INFO_STREAM_PATH = '/serverinfo/stream';

/**
 * Снимок состояния сервера: онлайн, предел мест и игровое время.
 */
export interface IServerInfoSnapshot {
    /**
     * Игроков сейчас на сервере.
     */
    online: number;

    /**
     * Предел мест на сервере.
     */
    max_online: number;

    /**
     * Игровое время мира (строка бэкенда).
     */
    time: string;
}

/**
 * Разбирает полезную нагрузку кадра SSE.
 *
 * @param raw Строка `data` из кадра.
 * @returns Снимок состояния или `null`, если кадр не похож на состояние сервера.
 */
function readServerInfoFrame(raw: string): IServerInfoSnapshot | null {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (typeof parsed !== 'object' || parsed === null) {
        return null;
    }

    const frame = parsed as Record<string, unknown>;
    const online = frame['online'];
    const maxOnline = frame['max_online'];
    const time = frame['time'];

    if (typeof online !== 'number' || typeof maxOnline !== 'number' || typeof time !== 'string') {
        return null;
    }

    return { online, max_online: maxOnline, time };
}

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
     * Идентификатор платформы: `EventSource` живёт только в браузере.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Общий поток состояния сервера: одно соединение на всё приложение.
     *
     * Поток мультикастен (`shareReplay`), поэтому шапка, главная, «Начать игру»
     * и «О сервере» делят одно соединение и один последний снимок.
     * `refCount: true` закрывает соединение, когда уходит последний подписчик.
     * В Node нет `EventSource`, поэтому на сервере вместо соединения идёт
     * один HTTP-запрос: первый рендер получает настоящие числа.
     */
    private readonly serverInfo$: Observable<IServerInfoSnapshot> = defer(() =>
        isPlatformBrowser(this.platformId) ? this.connectServerInfo$() : this.requestServerInfo$()
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    /**
     * Поток состояния сервера: онлайн, предел мест и игровое время.
     *
     * Первый кадр приходит сразу после подписки, дальше — при каждом изменении.
     * При ошибке соединения поток отдаёт последний снимок и один раз
     * дозапрашивает HTTP-фолбэк (`totalonline` + `worldtime`); переподключение
     * делает нативный `EventSource`, алерт при этом не показывается.
     * На сервере поток отдаёт один снимок из HTTP-запроса и завершается.
     *
     * @returns Поток снимков состояния сервера.
     */
    public watchServerInfo$(): Observable<IServerInfoSnapshot> {
        return this.serverInfo$;
    }

    /**
     * Получает количество игроков онлайн.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), шапка деградирует к прочерку.
     * Остаётся фолбэком для {@link watchServerInfo$}.
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
     * Остаётся фолбэком для {@link watchServerInfo$}.
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
        // Без большого лимита в выдаче только верх таблицы, и у остальных игроков в профиле не было статистики.
        const params = new HttpParams().set('filter', '0').set('limit', '1000');
        const key = name.trim().toLowerCase();

        return this.http
            .get<{ entries: Array<ILeaderBoard> }>(`${this.baseUrl}/leaderboard`, {
                params,
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map((response: { entries: Array<ILeaderBoard> }) =>
                    response.entries.find((entry: ILeaderBoard) => entry.name?.trim().toLowerCase() === key) ?? null
                )
            );
    }

    /**
     * Открывает SSE-соединение и превращает кадры в снимки состояния.
     *
     * Соединение закрывается при отписке последнего подписчика.
     *
     * @returns Поток снимков состояния сервера.
     */
    private connectServerInfo$(): Observable<IServerInfoSnapshot> {
        return new Observable<IServerInfoSnapshot>((subscriber) => {
            const source = new EventSource(`${this.baseUrl}${SERVER_INFO_STREAM_PATH}`);
            let lastSnapshot: IServerInfoSnapshot | null = null;
            let fallback: Subscription | null = null;

            const onFrame = (event: Event): void => {
                const snapshot = readServerInfoFrame((event as MessageEvent<string>).data);

                if (snapshot === null) {
                    return;
                }

                lastSnapshot = snapshot;
                subscriber.next(snapshot);
            };

            const onError = (): void => {
                // Нативный EventSource переподключается сам: сбой поток не закрывает.
                if (lastSnapshot !== null) {
                    subscriber.next(lastSnapshot);
                }

                // Фолбэк — один раз на соединение: иначе оборванная сеть давала бы
                // запрос на каждую попытку переподключения.
                if (fallback !== null) {
                    return;
                }

                fallback = this.requestServerInfo$().subscribe((snapshot) => subscriber.next(snapshot));
            };

            source.addEventListener(SERVER_INFO_EVENT, onFrame);
            source.addEventListener('error', onError);

            return (): void => {
                fallback?.unsubscribe();
                source.close();
            };
        });
    }

    /**
     * Запрашивает снимок состояния обычными HTTP-запросами.
     *
     * Единственный источник на сервере, где нет `EventSource`, и фолбэк
     * при обрыве соединения. Ошибка не поднимает алерт (`SKIP_ERROR_ALERT`)
     * и не рвёт поток: без ответа снимок просто не приходит.
     *
     * @returns Поток из одного снимка или пустой поток при ошибке.
     */
    private requestServerInfo$(): Observable<IServerInfoSnapshot> {
        return forkJoin({
            online: this.getOnlinePlayersCount$(),
            time: this.getTime$(),
        }).pipe(
            map(({ online, time }) => ({ online: online.online, max_online: online.max_online, time: time.time })),
            catchError(() => EMPTY)
        );
    }
}
