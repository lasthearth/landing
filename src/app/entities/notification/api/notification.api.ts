import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { NotificationDto, NotificationsPageDto } from '../model/notification.types';

/**
 * Сколько уведомлений отдаёт сервер за раз (больше 15 он не возвращает).
 */
const PAGE_SIZE = 15;

/**
 * API уведомлений текущего пользователя.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Последние уведомления пользователя (личные и общие), от новых к старым.
     *
     * Пустой список сервер отдаёт как 404 — превращаем его в пустой массив.
     * Ошибки не показываются: колокольчик просто останется пустым.
     *
     * @returns Observable со списком уведомлений.
     */
    public list(): Observable<NotificationDto[]> {
        return this.http
            .get<NotificationsPageDto>(`${this.baseUrl}/notifications`, {
                params: { page_size: PAGE_SIZE, order_by: 'created_at desc' },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map((page) => page.notifications ?? []),
                catchError((error: unknown) =>
                    error instanceof HttpErrorResponse && error.status === 404 ? of([]) : throwError(() => error)
                )
            );
    }

    /**
     * Отмечает личное уведомление прочитанным.
     *
     * Для общих уведомлений не вызывать: на сервере у них одно состояние на всех.
     *
     * @param id Идентификатор уведомления.
     */
    public markAsRead(id: string): Observable<void> {
        return this.http
            .post<unknown>(
                `${this.baseUrl}/notifications/${encodeURIComponent(id)}:markAsRead`,
                {},
                {
                    context: new HttpContext().set(SKIP_ERROR_ALERT, true),
                }
            )
            .pipe(map(() => undefined));
    }
}
