import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { catchError, EMPTY, timeout } from 'rxjs';

/**
 * Сколько сервер ждёт API, прежде чем отдать страницу со скелетоном.
 */
const SERVER_API_TIMEOUT_MS = 3000;

/**
 * Ограничивает ожидание API при серверном рендере.
 *
 * Без него медленный или недоступный API держал бы ответ роботу сколько угодно:
 * сервер обязан отдать страницу за секунды. Если ответа нет — запрос молча
 * заканчивается, страница уходит со скелетоном (200), а данные догружает браузер
 * после гидратации. В браузере интерцептор ничего не делает.
 */
export const serverApiTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
        return next(req);
    }

    return next(req).pipe(
        timeout(SERVER_API_TIMEOUT_MS),
        catchError(() => EMPTY)
    );
};
