import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { mapSavedReplyDto, mapTicketDto, mapTicketListDto } from '../model/ticket.mapper';
import {
    AdminTicketCounters,
    AdminTicketPatch,
    AdminTicketQuery,
    CreateTicketRequest,
    SavedReply,
    SavedReplyDto,
    Ticket,
    TicketDto,
    TicketListDto,
    TicketPage,
} from '../model/ticket.types';

/**
 * Размер страницы списков обращений.
 */
const PAGE_SIZE = '30';

/**
 * API обращений в поддержку: свои обращения игрока и входящие администрации.
 *
 * Ошибки не показываются всплывающим окном: страницы объясняют их сами,
 * а фоновые обновления не должны кричать при каждом сбое сети.
 */
@Injectable({ providedIn: 'root' })
export class TicketApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Обращения игрока.
     */
    private readonly mine = `${environment.apiUrl}/tickets`;

    /**
     * Входящие администрации.
     */
    private readonly admin = `${environment.apiUrl}/admin/tickets`;

    /**
     * Шаблоны ответов.
     */
    private readonly replies = `${environment.apiUrl}/admin/ticket-replies`;

    /**
     * Контекст без всплывающих ошибок.
     */
    private readonly quiet = new HttpContext().set(SKIP_ERROR_ALERT, true);

    /**
     * Открывает обращение.
     *
     * @param request Тема, категория и первое сообщение.
     * @returns Observable с обращением.
     */
    public create(request: CreateTicketRequest): Observable<Ticket> {
        return this.http.post<TicketDto>(this.mine, request, { context: this.quiet }).pipe(map(mapTicketDto));
    }

    /**
     * Свои обращения, свежие первыми.
     *
     * @param pageToken Токен страницы (`null` — первая).
     * @returns Observable со страницей.
     */
    public listMine(pageToken: string | null = null): Observable<TicketPage> {
        const params: Record<string, string> = { page_size: PAGE_SIZE };
        if (pageToken) {
            params['page_token'] = pageToken;
        }
        return this.http.get<TicketListDto>(this.mine, { params, context: this.quiet }).pipe(map(mapTicketListDto));
    }

    /**
     * Своё обращение с перепиской; снимает отметку «не прочитано».
     *
     * @param id Обращение.
     * @returns Observable с обращением.
     */
    public get(id: string): Observable<Ticket> {
        return this.http.get<TicketDto>(this.url(this.mine, id), { context: this.quiet }).pipe(map(mapTicketDto));
    }

    /**
     * Пишет в своё обращение.
     *
     * @param id Обращение.
     * @param text Сообщение.
     * @returns Observable с обновлённым обращением.
     */
    public post(id: string, text: string): Observable<Ticket> {
        return this.http
            .post<TicketDto>(`${this.url(this.mine, id)}/messages`, { text }, { context: this.quiet })
            .pipe(map(mapTicketDto));
    }

    /**
     * Закрывает своё обращение.
     *
     * @param id Обращение.
     * @returns Observable с закрытым обращением.
     */
    public close(id: string): Observable<Ticket> {
        return this.http
            .post<TicketDto>(`${this.url(this.mine, id)}:close`, {}, { context: this.quiet })
            .pipe(map(mapTicketDto));
    }

    /**
     * Открывает своё закрытое обращение снова.
     *
     * @param id Обращение.
     * @returns Observable с открытым обращением.
     */
    public reopen(id: string): Observable<Ticket> {
        return this.http
            .post<TicketDto>(`${this.url(this.mine, id)}:reopen`, {}, { context: this.quiet })
            .pipe(map(mapTicketDto));
    }

    /**
     * Сколько своих обращений ждут прочтения ответа.
     *
     * @returns Observable с числом.
     */
    public unreadCount(): Observable<number> {
        return this.http
            .get<{ unread?: number }>(`${this.mine}:counters`, { context: this.quiet })
            .pipe(map((response) => response.unread ?? 0));
    }

    /**
     * Входящие администрации, свежая активность первой.
     *
     * @param query Отбор и страница.
     * @returns Observable со страницей.
     */
    public adminList(query: AdminTicketQuery): Observable<TicketPage> {
        const params: Record<string, string> = { page_size: PAGE_SIZE, assignee: query.assignee };
        if (query.status) {
            params['status'] = query.status;
        }
        if (query.category) {
            params['category'] = query.category;
        }
        if (query.pageToken) {
            params['page_token'] = query.pageToken;
        }
        return this.http.get<TicketListDto>(this.admin, { params, context: this.quiet }).pipe(map(mapTicketListDto));
    }

    /**
     * Обращение с перепиской и заметками; снимает отметку «не прочитано» у администрации.
     *
     * @param id Обращение.
     * @returns Observable с обращением.
     */
    public adminGet(id: string): Observable<Ticket> {
        return this.http.get<TicketDto>(this.url(this.admin, id), { context: this.quiet }).pipe(map(mapTicketDto));
    }

    /**
     * Отвечает игроку или оставляет внутреннюю заметку.
     *
     * @param id Обращение.
     * @param text Текст.
     * @param internal Заметка только для администрации.
     * @param close Закрыть обращение этим ответом.
     * @returns Observable с обновлённым обращением.
     */
    public adminReply(id: string, text: string, internal: boolean, close: boolean): Observable<Ticket> {
        return this.http
            .post<TicketDto>(`${this.url(this.admin, id)}/messages`, { text, internal, close }, { context: this.quiet })
            .pipe(map(mapTicketDto));
    }

    /**
     * Меняет категорию, статус или исполнителя.
     *
     * @param id Обращение.
     * @param patch Изменения.
     * @returns Observable с обновлённым обращением.
     */
    public adminUpdate(id: string, patch: AdminTicketPatch): Observable<Ticket> {
        return this.http
            .patch<TicketDto>(this.url(this.admin, id), patch, { context: this.quiet })
            .pipe(map(mapTicketDto));
    }

    /**
     * Счётчики входящих.
     *
     * @returns Observable со счётчиками.
     */
    public adminCounters(): Observable<AdminTicketCounters> {
        return this.http
            .get<{
                open?: number;
                open_unassigned?: number;
                open_mine?: number;
                unread?: number;
            }>(`${this.admin}:counters`, { context: this.quiet })
            .pipe(
                map((dto) => ({
                    open: dto.open ?? 0,
                    openUnassigned: dto.open_unassigned ?? 0,
                    openMine: dto.open_mine ?? 0,
                    unread: dto.unread ?? 0,
                }))
            );
    }

    /**
     * Шаблоны ответов по названию.
     *
     * @returns Observable со списком.
     */
    public listReplies(): Observable<SavedReply[]> {
        return this.http
            .get<{ replies?: SavedReplyDto[] }>(this.replies, { context: this.quiet })
            .pipe(map((response) => (response.replies ?? []).map(mapSavedReplyDto)));
    }

    /**
     * Сохраняет новый шаблон.
     *
     * @param title Название.
     * @param text Текст.
     * @returns Observable с шаблоном.
     */
    public createReply(title: string, text: string): Observable<SavedReply> {
        return this.http
            .post<SavedReplyDto>(this.replies, { title, text }, { context: this.quiet })
            .pipe(map(mapSavedReplyDto));
    }

    /**
     * Меняет шаблон.
     *
     * @param id Шаблон.
     * @param title Название.
     * @param text Текст.
     * @returns Observable с шаблоном.
     */
    public updateReply(id: string, title: string, text: string): Observable<SavedReply> {
        return this.http
            .patch<SavedReplyDto>(this.url(this.replies, id), { title, text }, { context: this.quiet })
            .pipe(map(mapSavedReplyDto));
    }

    /**
     * Удаляет шаблон.
     *
     * @param id Шаблон.
     * @returns Observable, завершающийся после удаления.
     */
    public deleteReply(id: string): Observable<void> {
        return this.http.delete<void>(this.url(this.replies, id), { context: this.quiet });
    }

    /**
     * Адрес одного объекта.
     *
     * @param base Коллекция.
     * @param id Объект.
     * @returns Адрес.
     */
    private url(base: string, id: string): string {
        return `${base}/${encodeURIComponent(id)}`;
    }
}
