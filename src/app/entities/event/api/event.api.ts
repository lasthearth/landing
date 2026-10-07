import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { mapEventDto } from '../model/event.mapper';
import { CalendarEvent, EventDto, EventsPageDto, SaveEventRequest } from '../model/event.types';

/**
 * Сколько событий запрашивать за раз (максимум по контракту — 100).
 */
const PAGE_SIZE = 50;

/**
 * API календаря событий.
 *
 * Чтение публичное; создание, изменение и удаление — для тех, кто может публиковать новости.
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
     * Превращает список из API в модели, отбрасывая некорректные записи.
     *
     * @param events События из API.
     * @returns События для интерфейса.
     */
    private mapList(events: EventDto[] | undefined): CalendarEvent[] {
        return (events ?? []).map(mapEventDto).filter((event): event is CalendarEvent => event !== null);
    }
}
