import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { MAIL_PAGE_SIZE } from '../config/mail-page-size.constant';
import { mapMailListDto } from '../model/mail.mapper';
import { ComposeMailRequest, ComposeMailResponse, MailListDto, MailPage } from '../model/mail.types';

/**
 * API почты: отправка письма игроку или всем и список отправленного.
 *
 * Оба эндпоинта закрыты скоупами: `POST /mail:compose` требует `mail:compose`,
 * `GET /admin/mail` — `mail:read`. Запросы идут тихо (`SKIP_ERROR_ALERT`):
 * страница сама рисует состояние «нет прав» и ошибку загрузки, а общий алерт
 * на `403` объяснял бы нехватку права тому, кто её и так видит в интерфейсе.
 * `Bearer` добавляет `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class MailApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API (`…/v1`).
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Контекст без общего алерта об ошибке.
     */
    private readonly quiet = new HttpContext().set(SKIP_ERROR_ALERT, true);

    /**
     * Отправляет письмо игроку или всем.
     *
     * С кастомным глаголом в пути (`mail:compose`), а не отдельным ресурсом:
     * так объявлен контракт. Ключ идемпотентности в теле делает повторный
     * запрос безопасным — сервер вернёт то же письмо, а не создаст второе.
     *
     * ⚠️ Требует права `mail:compose`. Ошибку обрабатывает форма: `400` —
     * неверное поле, `403` — нет права, `500` — повтор.
     *
     * @param request Адресат, заголовок, текст, вложения, срок жизни и ключ идемпотентности.
     * @returns Observable с идентификатором созданного письма.
     */
    public compose$(request: ComposeMailRequest): Observable<ComposeMailResponse> {
        return this.http.post<ComposeMailResponse>(`${this.baseUrl}/mail:compose`, request, {
            context: this.quiet,
        });
    }

    /**
     * Читает страницу отправленных писем, свежие первыми.
     *
     * Пагинация курсорная: страница запрашивается либо первая (без токена), либо
     * следующая (с токеном прошлого ответа). Фильтр `broadcast_only` сильнее
     * фильтра `recipient`, поэтому сайт передаёт только его.
     *
     * ⚠️ Требует права `mail:read`. Ошибку показывает панель списка.
     *
     * @param broadcastOnly Только письма всем игрокам.
     * @param pageToken Курсор страницы из прошлого ответа; пусто — первая страница.
     * @returns Observable со страницей писем.
     */
    public listSent$(broadcastOnly: boolean, pageToken = ''): Observable<MailPage> {
        const params: Record<string, string> = { page_size: String(MAIL_PAGE_SIZE) };

        if (pageToken.length > 0) {
            params['page_token'] = pageToken;
        }

        if (broadcastOnly) {
            params['broadcast_only'] = 'true';
        }

        return this.http
            .get<MailListDto>(`${this.baseUrl}/admin/mail`, { params, context: this.quiet })
            .pipe(map(mapMailListDto));
    }
}