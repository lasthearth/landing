import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TuiAlertService } from '@taiga-ui/core';
import { EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * HTTP-интерцептор для централизованной обработки ошибок.
 *
 * Для GET-запросов при ошибке показывает уведомление и возвращает `EMPTY`,
 * чтобы подписчики не получали unhandled exception в консоль.
 * Для модифицирующих запросов (POST, PUT, DELETE) пробрасывает ошибку дальше
 * после показа уведомления.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const alerts = inject(TuiAlertService);

    return next(req).pipe(
        catchError((err: HttpErrorResponse) => {
            const message = getErrorMessage(err);

            // Для GET-запросов показываем алерт здесь, т.к. компоненты обычно не ловят ошибку
            if (req.method === 'GET') {
                alerts.open(message, { label: 'Ошибка', appearance: 'negative' }).subscribe();
                return EMPTY;
            }

            // Для модифицирующих запросов (POST/PUT/DELETE) алерт покажет компонент через RequestStatusService
            return throwError(() => err);
        })
    );
};

/**
 * Формирует человекочитаемое сообщение об ошибке.
 *
 * @param error HTTP-ошибка.
 * @returns Строка с описанием ошибки.
 */
function getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
        return 'Нет соединения с сервером.';
    }

    if (error.status >= 500) {
        return 'Ошибка сервера. Попробуйте позже.';
    }

    if (error.status === 401) {
        return 'Требуется авторизация.';
    }

    if (error.status === 403) {
        return 'Недостаточно прав.';
    }

    if (error.status === 404) {
        return 'Ресурс не найден.';
    }

    if (typeof error.error?.message === 'string') {
        return error.error.message;
    }

    return `Ошибка ${error.status}: ${error.statusText}`;
}
