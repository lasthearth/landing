import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '@core/config/environments/environment';
import { WikiArticle, WikiDraft, WikiStatus } from '../model/wiki-article.model';
import {
    WikiArticleDto,
    WikiListDto,
    WikiRevisionDto,
    WikiRevisionsDto,
    WikiSuggestionDto,
    WikiSuggestionKind,
    WikiSuggestionListDto,
    WikiSuggestionStatus,
} from '../model/wiki.types';
import { mapArticleFromDto, mapDraftToDto } from '../model/wiki.mapper';

/**
 * Что редактор присылает при сохранении статьи.
 */
export interface WikiSavePayload {
    /**
     * Статья из формы.
     */
    readonly draft: WikiDraft;
    /**
     * Статус после сохранения.
     */
    readonly status: WikiStatus;
    /**
     * Комментарий к правке.
     */
    readonly note: string;
    /**
     * Версия, на которой основана правка; `0` — без проверки.
     */
    readonly expectedVersion: number;
}

/**
 * Что игрок присылает как предложение.
 */
export interface WikiSuggestionPayload {
    /**
     * Статья, которую предлагают: править существующую или создать новую.
     */
    readonly proposal: WikiArticleDto;
    /**
     * Адрес правимой статьи; пусто — предложение новой.
     */
    readonly articleId: string;
    /**
     * Пояснение автора.
     */
    readonly note: string;
    /**
     * Версия статьи, от которой писал игрок; `0` — новая статья.
     */
    readonly baseVersion: number;
}

/**
 * Предложение в модели компонентов.
 */
export interface WikiSuggestion {
    readonly id: string;
    readonly kind: WikiSuggestionKind;
    readonly articleId: string;
    readonly slug: string;
    readonly status: WikiSuggestionStatus;
    readonly note: string;
    readonly authorName: string;
    readonly reviewerName: string;
    readonly rejectReason: string;
    readonly createdAt: string;
    readonly reviewedAt: string;
    readonly appliedArticleId: string;
    readonly proposal: WikiArticle | null;
    /**
     * Версия статьи, от которой автор писал правку; `0` — версия неизвестна.
     */
    readonly baseVersion: number;
    /**
     * Статья, какой её видел автор правки; `null` у старых предложений.
     */
    readonly base: WikiArticle | null;
}

/**
 * API-сервис вики.
 *
 * Токен добавляет `authInterceptor`, поэтому один и тот же метод работает и
 * для гостя (опубликованные статьи), и для админа (вместе с черновиками,
 * которые сервер отдаёт только редактору).
 */
@Injectable({ providedIn: 'root' })
export class WikiApiService {
    private readonly http = inject(HttpClient);

    private readonly baseUrl = environment.apiUrl;

    /**
     * Ограничение размера страницы из контракта.
     */
    private static readonly MAX_PAGE_SIZE = 50;

    /**
     * Предохранитель постраничной загрузки — как в хранилище вики.
     */
    private static readonly MAX_PAGES = 40;

    /**
     * Список статей.
     *
     * @param params Фильтры и пагинация.
     * @returns Статьи и курсор следующей страницы.
     */
    public list(
        params: {
            pageSize?: number;
            pageToken?: string;
            section?: string;
            status?: string;
            search?: string;
            tag?: string;
        } = {}
    ): Observable<{ articles: WikiArticle[]; next: string; total: number }> {
        const query: Record<string, string | number> = {
            page_size: Math.min(params.pageSize ?? WikiApiService.MAX_PAGE_SIZE, WikiApiService.MAX_PAGE_SIZE),
        };

        if (params.pageToken) query['page_token'] = params.pageToken;
        if (params.section) query['section'] = params.section;
        if (params.status) query['status'] = params.status;
        if (params.search) query['search'] = params.search;
        if (params.tag) query['tag'] = params.tag;

        return this.http.get<WikiListDto>(`${this.baseUrl}/wiki/articles`, { params: query }).pipe(
            map((response) => ({
                articles: (response.articles ?? []).map(mapArticleFromDto),
                next: response.next_page_token ?? '',
                total: Number(response.total_size ?? 0),
            }))
        );
    }

    /**
     * Статья по идентификатору.
     *
     * @param id Идентификатор статьи.
     * @param context HTTP-контекст запроса (например, `SKIP_ERROR_ALERT`).
     */
    public getById(id: string, context?: HttpContext): Observable<WikiArticle> {
        return this.http
            .get<WikiArticleDto>(`${this.baseUrl}/wiki/articles/${encodeURIComponent(id)}`, { context })
            .pipe(map(mapArticleFromDto));
    }

    /**
     * Статья по адресу.
     *
     * @param slug Адрес статьи.
     * @param context HTTP-контекст запроса (например, `SKIP_ERROR_ALERT`).
     */
    public getBySlug(slug: string, context?: HttpContext): Observable<WikiArticle> {
        return this.http
            .get<WikiArticleDto>(`${this.baseUrl}/wiki/articles/by-slug/${encodeURIComponent(slug)}`, { context })
            .pipe(map(mapArticleFromDto));
    }

    /**
     * Создаёт статью.
     *
     * @param payload Статья и комментарий.
     */
    public create(payload: WikiSavePayload): Observable<WikiArticle> {
        return this.http
            .post<WikiArticleDto>(`${this.baseUrl}/wiki/articles`, {
                article: mapDraftToDto(payload.draft, null, payload.status).article,
            })
            .pipe(map(mapArticleFromDto));
    }

    /**
     * Обновляет статью.
     *
     * @param id Идентификатор статьи.
     * @param payload Статья, комментарий и версия, на которой основана правка.
     */
    public update(id: string, payload: WikiSavePayload): Observable<WikiArticle> {
        // expected_version приходит из payload: после конфликта редактора
        // отправляет версию, которую только что перечитал у сервера.
        return this.http
            .put<WikiArticleDto>(`${this.baseUrl}/wiki/articles/${encodeURIComponent(id)}`, {
                article: mapDraftToDto(payload.draft, id, payload.status).article,
                expected_version: payload.expectedVersion,
                note: payload.note,
            })
            .pipe(map(mapArticleFromDto));
    }

    /**
     * Удаляет статью.
     *
     * @param id Идентификатор статьи.
     */
    public remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/wiki/articles/${encodeURIComponent(id)}`);
    }

    /**
     * История правок статьи.
     *
     * @param id Идентификатор статьи.
     */
    public revisions(id: string): Observable<WikiRevisionDto[]> {
        return this.http
            .get<WikiRevisionsDto>(`${this.baseUrl}/wiki/articles/${encodeURIComponent(id)}/revisions`)
            .pipe(map((response) => response.revisions ?? []));
    }

    /**
     * Отправляет предложение игрока.
     *
     * @param payload Предложенная статья и пояснение.
     * @returns Сохранённое предложение.
     */
    public submitSuggestion(payload: WikiSuggestionPayload): Observable<WikiSuggestion> {
        return this.http
            .post<WikiSuggestionDto>(`${this.baseUrl}/wiki/suggestions`, {
                suggestion: {
                    article_id: payload.articleId,
                    proposal: payload.proposal,
                    note: payload.note,
                    base_version: payload.baseVersion,
                },
            })
            .pipe(map(mapSuggestionFromDto));
    }

    /**
     * Свои предложения; редактору сервер отдаёт всю очередь.
     *
     * Очередь читается по страницам, как список статей: редактору она нужна
     * целиком, а сервер отдаёт не больше 50 предложений за раз.
     *
     * @param status Фильтр по состоянию проверки.
     */
    public suggestions(status?: WikiSuggestionStatus): Observable<WikiSuggestion[]> {
        const query: Record<string, string | number> = { page_size: WikiApiService.MAX_PAGE_SIZE };

        if (status) {
            query['status'] = status;
        }

        return this.readSuggestions(query, '', [], 0);
    }

    /**
     * Читает одну страницу предложений и, если курсор есть, идёт за следующей.
     *
     * @param query Фильтры запроса.
     * @param pageToken Курсор страницы.
     * @param acc Уже собранные предложения.
     * @param page Номер страницы: предохранитель от бесконечного цикла.
     */
    private readSuggestions(
        query: Record<string, string | number>,
        pageToken: string,
        acc: readonly WikiSuggestion[],
        page: number
    ): Observable<WikiSuggestion[]> {
        const params: Record<string, string | number> = { ...query };

        if (pageToken) {
            params['page_token'] = pageToken;
        }

        return this.http.get<WikiSuggestionListDto>(`${this.baseUrl}/wiki/suggestions`, { params }).pipe(
            switchMap((response) => {
                const collected = [...acc, ...(response.suggestions ?? []).map(mapSuggestionFromDto)];
                const next = response.next_page_token ?? '';

                if (!next) {
                    return of(collected);
                }

                if (page + 1 >= WikiApiService.MAX_PAGES) {
                    console.warn(`WikiApiService: остановлен на ${WikiApiService.MAX_PAGES} страницах предложений`);

                    return of(collected);
                }

                return this.readSuggestions(query, next, collected, page + 1);
            })
        );
    }

    /**
     * Одобряет предложение.
     *
     * @param id Идентификатор предложения.
     * @param allowStale Одобрить правку, написанную от старой версии статьи.
     */
    public approveSuggestion(id: string, allowStale = false): Observable<WikiSuggestion> {
        return this.http
            .post<WikiSuggestionDto>(`${this.baseUrl}/wiki/suggestions/${encodeURIComponent(id)}/approve`, {
                allow_stale: allowStale,
            })
            .pipe(map(mapSuggestionFromDto));
    }

    /**
     * Отклоняет предложение с причиной.
     *
     * @param id Идентификатор предложения.
     * @param reason Причина отказа, её увидит автор.
     */
    public rejectSuggestion(id: string, reason: string): Observable<WikiSuggestion> {
        return this.http
            .post<WikiSuggestionDto>(`${this.baseUrl}/wiki/suggestions/${encodeURIComponent(id)}/reject`, {
                reason,
            })
            .pipe(map(mapSuggestionFromDto));
    }
}

/**
 * Преобразует предложение из DTO в модель компонентов.
 *
 * @param dto Предложение из API.
 */
export function mapSuggestionFromDto(dto: WikiSuggestionDto): WikiSuggestion {
    return {
        id: dto.id,
        kind: mapSuggestionKindFromDto(dto.kind),
        articleId: dto.article_id ?? '',
        slug: dto.slug ?? '',
        status: mapSuggestionStatusFromDto(dto.status),
        note: dto.note ?? '',
        authorName: dto.author_name ?? '',
        reviewerName: dto.reviewer_name ?? '',
        rejectReason: dto.reject_reason ?? '',
        createdAt: dto.created_at ?? '',
        reviewedAt: dto.reviewed_at ?? '',
        appliedArticleId: dto.applied_article_id ?? '',
        proposal: dto.proposal ? mapArticleFromDto(dto.proposal) : null,
        // int64 из gateway приходит строкой — как и version статьи.
        baseVersion: Number(dto.base_version ?? 0),
        base: dto.base ? mapArticleFromDto(dto.base) : null,
    };
}

/**
 * Переводит строку protobuf-энума в вид предложения.
 *
 * @param value Значение из API.
 */
function mapSuggestionKindFromDto(value: string | undefined): WikiSuggestionKind {
    return value === 'SUGGESTION_KIND_ARTICLE_EDIT' ? 'edit' : 'new';
}

/**
 * Переводит строку protobuf-энума в состояние проверки.
 *
 * @param value Значение из API.
 */
function mapSuggestionStatusFromDto(value: string | undefined): WikiSuggestionStatus {
    if (value === 'SUGGESTION_STATUS_APPROVED') return 'approved';
    if (value === 'SUGGESTION_STATUS_REJECTED') return 'rejected';

    return 'pending';
}
