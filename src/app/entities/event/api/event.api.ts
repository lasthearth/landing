import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { mapEventDto } from '../model/event.mapper';
import {
    CalendarEvent,
    EventAttendance,
    EventAttendees,
    EventDto,
    EventsPageDto,
    SaveEventRequest,
} from '../model/event.types';

/**
 * Сколько событий запрашивать за раз (максимум по контракту — 100).
 */
const PAGE_SIZE = 50;

/**
 * API календаря событий.
 *
 * Чтение публичное; создание, изменение и удаление — для тех, кто может публиковать новости;
 * запись на событие и «Мои события» — для вошедших игроков.
 */
@Injectable({ providedIn: 'root' })
export class EventApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Список событий.
     *
     * Предстоящие (и идущие сейчас) — от ближайшего; прошедшие — от недавнего.
     * Ошибка не показывается: потребитель сам решает, как её отобразить.
     *
     * @param past `true` — прошедшие, иначе предстоящие.
     * @param pageSize Сколько событий вернуть.
     * @returns Observable со списком событий.
     */
    public list(past: boolean, pageSize = PAGE_SIZE): Observable<CalendarEvent[]> {
        return this.http
            .get<EventsPageDto>(`${this.baseUrl}/events`, {
                params: { page_size: pageSize, past },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((page) => this.mapList(page.events)));
    }

    /**
     * Создаёт событие.
     *
     * @param request Данные события.
     * @returns Observable с созданным событием.
     */
    public create(request: SaveEventRequest): Observable<CalendarEvent | null> {
        return this.http.post<EventDto>(`${this.baseUrl}/events`, request).pipe(map(mapEventDto));
    }

    /**
     * Изменяет событие.
     *
     * @param id Идентификатор.
     * @param request Новые данные события (все поля целиком).
     * @returns Observable с изменённым событием.
     */
    public update(id: string, request: SaveEventRequest): Observable<CalendarEvent | null> {
        return this.http
            .patch<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(id)}`, { id, ...request })
            .pipe(map(mapEventDto));
    }

    /**
     * Удаляет событие.
     *
     * @param id Идентификатор.
     * @returns Observable, завершающийся после удаления.
     */
    public delete(id: string): Observable<void> {
        return this.http.delete<unknown>(`${this.baseUrl}/events/${encodeURIComponent(id)}`).pipe(map(() => undefined));
    }

    /**
     * Записывает на событие («Пойду») или отменяет запись. Повтор ничего не меняет.
     *
     * @param id Событие.
     * @param attending `true` — записаться, `false` — отказаться.
     * @returns Observable с итогом.
     */
    public setAttendance(id: string, attending: boolean): Observable<EventAttendance> {
        return this.http
            .post<{
                attending?: boolean;
                attendee_count?: number;
                attendee_preview?: string[];
            }>(`${this.baseUrl}/events/${encodeURIComponent(id)}/attendance`, { attending }, { context: new HttpContext().set(SKIP_ERROR_ALERT, true) })
            .pipe(
                map((response) => ({
                    attending: !!response.attending,
                    count: response.attendee_count ?? 0,
                    preview: response.attendee_preview ?? [],
                }))
            );
    }

    /**
     * Все записавшиеся на событие, в порядке записи.
     *
     * @param id Событие.
     * @returns Observable со списком.
     */
    public attendees(id: string): Observable<EventAttendees> {
        return this.http
            .get<{
                user_ids?: string[];
                total?: number;
            }>(`${this.baseUrl}/events/${encodeURIComponent(id)}/attendees`, { params: { page_size: 200 }, context: new HttpContext().set(SKIP_ERROR_ALERT, true) })
            .pipe(map((response) => ({ userIds: response.user_ids ?? [], total: response.total ?? 0 })));
    }

    /**
     * События, на которые записан игрок.
     *
     * @param past `true` — прошедшие, иначе предстоящие и идущие.
     * @returns Observable со списком.
     */
    public mine(past = false): Observable<CalendarEvent[]> {
        return this.http
            .get<EventsPageDto>(`${this.baseUrl}/events:mine`, {
                params: { page_size: 100, past },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((page) => this.mapList(page.events)));
    }

    /**
     * Превращает список из API в модели, отбрасывая некорректные записи.
     *
     * @param events События из API.
     * @returns События для интерфейса.
     */
    private mapList(events: EventDto[] | undefined): CalendarEvent[] {
        return (events ?? []).map(mapEventDto).filter((event): event is CalendarEvent => event !== null);
    }
}
