import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Event, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';

/**
 * Признак того, что идёт переход между страницами.
 *
 * Нужен для страниц, которые приезжают ленивым чанком: пока браузер скачивает
 * и разбирает код, на экране не меняется ничего, и клик по ссылке выглядит так,
 * будто он не сработал.
 *
 * Считаются только события перехода. Роутер шлёт и другие — например,
 * `Scroll` при включённом `withInMemoryScrolling` он отправляет на каждое
 * движение страницы, — и если реагировать на «всё, кроме конца», полоса
 * загрузки висела бы постоянно.
 */
@Injectable({ providedIn: 'root' })
export class RouteLoadingService {
    private readonly router = inject(Router);

    /**
     * Идёт переход.
     */
    public readonly loading = toSignal(
        this.router.events.pipe(
            filter(isNavigationLifecycle),
            map((event) => event instanceof NavigationStart)
        ),
        { initialValue: false }
    );
}

/**
 * Относится ли событие к переходу между страницами.
 *
 * Четыре события описывают весь переход: начало, успех, отмена стражем и
 * ошибка. Всё остальное — прокрутка, изменение URL, отложенная загрузка — о
 * состоянии перехода ничего не говорит.
 *
 * @param event Событие роутера.
 * @returns `true` для событий перехода.
 */
function isNavigationLifecycle(event: Event): boolean {
    return (
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
    );
}
