import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PreloadingStrategy, Route } from '@angular/router';
import { catchError, EMPTY, Observable, switchMap } from 'rxjs';
import { whenIdle } from '@shared/lib/when-idle.function';
import { NAV_PRELOAD_PATHS } from './nav-preload-paths.constant';

/** Предел ожидания окна простоя перед фоновым скачиванием, мс. */
const PRELOAD_IDLE_TIMEOUT_MS = 3000;

/**
 * Стратегия преалодинга разделов главного меню.
 *
 * Без преалодинга клик по пункту меню сначала скачивал чанк страницы и её
 * словарь переводов, и до ответа сети на экране ничего не менялось — именно
 * эту паузу показывает `RouteLoadingService`.
 *
 * Скачиваются только разделы из `NAV_PRELOAD_PATHS` и только когда браузер
 * освободился, чтобы фоновая работа не спорила с первым экраном. Полный
 * `PreloadAllModules` не подходит: он тянул бы ещё админку, юридические
 * страницы и профиль — около сотни чанков.
 *
 * На сервере стратегия молчит: пререндеру клиентские чанки не нужны. Ошибка
 * скачивания (например, деплой заменил хеши файлов) гасится — при обычном
 * переходе роутер запросит чанк заново.
 */
@Injectable({ providedIn: 'root' })
export class NavPreloadingStrategy implements PreloadingStrategy {
    /**
     * Идентификатор платформы: на сервере преалодинг выключен.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Решает, скачивать ли чанк роута заранее.
     *
     * @param route Конфигурация роута из `app.routes.ts`.
     * @param load Загрузчик чанка: компонент страницы вместе со словарём (`loadPage`).
     * @returns Поток загрузки либо пустой поток, если роут заранее не нужен.
     */
    public preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
        if (!isPlatformBrowser(this.platformId) || !route.loadComponent || !NAV_PRELOAD_PATHS.includes(route.path ?? '')) {
            return EMPTY;
        }

        return whenIdle(PRELOAD_IDLE_TIMEOUT_MS).pipe(switchMap(load), catchError(() => EMPTY));
    }
}
