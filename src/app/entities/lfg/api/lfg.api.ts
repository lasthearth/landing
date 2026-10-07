import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { mapLfgPostDto } from '../model/lfg.mapper';
import { CreateLfgPostRequest, LfgActivity, LfgKind, LfgPost, LfgPostDto, LfgRespondResult } from '../model/lfg.types';

/**
 * API доски «Ищу компанию».
 *
 * Чтение публичное (без контактов); публикация, отклик, продление, закрытие
 * и контакт автора — для вошедших игроков.
 * Ошибки не показываются всплывающим окном: страница объясняет их сама.
 */
@Injectable({ providedIn: 'root' })
export class LfgApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = `${environment.apiUrl}/lfg/posts`;

    /**
     * Контекст без всплывающих ошибок.
     */
    private readonly quiet = new HttpContext().set(SKIP_ERROR_ALERT, true);

    /**
     * Открытые объявления одного вида: походы — ближайшие первыми, поиск
     * напарника — свежие первыми.
     *
     * @param kind Вид объявлений.
     * @param activity Только это занятие (`null` — все).
     * @returns Observable со списком.
     */
    public list(kind: LfgKind, activity: LfgActivity | null = null): Observable<LfgPost[]> {
        const params: Record<string, string> = { kind, page_size: '100' };
        if (activity) {
            params['activity'] = activity;
        }

        return this.http
            .get<{ posts?: LfgPostDto[] }>(this.baseUrl, { params, context: this.quiet })
            .pipe(map((response) => (response.posts ?? []).map(mapLfgPostDto)));
    }

    /**
     * Публикует объявление.
     *
     * @param request Объявление.
     * @returns Observable с созданным объявлением.
     */
    public create(request: CreateLfgPostRequest): Observable<LfgPost> {
        return this.http.post<LfgPostDto>(this.baseUrl, request, { context: this.quiet }).pipe(map(mapLfgPostDto));
    }

    /**
     * Присоединяется к компании или выходит из неё.
     *
     * @param id Объявление.
     * @returns Observable с итогом.
     */
    public respond(id: string): Observable<LfgRespondResult> {
        return this.http
            .post<{ joined?: boolean; post: LfgPostDto }>(
                `${this.baseUrl}/${encodeURIComponent(id)}:respond`,
                {},
                {
                    context: this.quiet,
                }
            )
            .pipe(map((response) => ({ joined: !!response.joined, post: mapLfgPostDto(response.post) })));
    }

    /**
     * Закрывает объявление (только автор).
     *
     * @param id Объявление.
     * @returns Observable с закрытым объявлением.
     */
    public close(id: string): Observable<LfgPost> {
        return this.http
            .post<LfgPostDto>(`${this.baseUrl}/${encodeURIComponent(id)}:close`, {}, { context: this.quiet })
            .pipe(map(mapLfgPostDto));
    }

    /**
     * Продлевает поиск напарника на 14 дней и поднимает его наверх (только
     * автор, раз в сутки).
     *
     * @param id Объявление.
     * @returns Observable с продлённым объявлением.
     */
    public renew(id: string): Observable<LfgPost> {
        return this.http
            .post<LfgPostDto>(`${this.baseUrl}/${encodeURIComponent(id)}:renew`, {}, { context: this.quiet })
            .pipe(map(mapLfgPostDto));
    }

    /**
     * Контакт автора (Discord, Telegram…).
     *
     * @param id Объявление.
     * @returns Observable с контактом (пустая строка — автор не указал).
     */
    public contact(id: string): Observable<string> {
        return this.http
            .get<{ contact?: string }>(`${this.baseUrl}/${encodeURIComponent(id)}/contact`, { context: this.quiet })
            .pipe(map((response) => response.contact ?? ''));
    }
}
