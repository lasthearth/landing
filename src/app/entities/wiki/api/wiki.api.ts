import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
     */
    public getById(id: string): Observable<WikiArticle> {
        return this.http
            .get<WikiArticleDto>(`${this.baseUrl}/wiki/articles/${encodeURIComponent(id)}`)
            .pipe(map(mapArticleFromDto));
    }

    /**
     * Статья по адресу.
     *
     * @param slug Адрес статьи.
     */
    public getBySlug(slug: string): Observable<WikiArticle> {
        return this.http
            .get<WikiArticleDto>(`${this.baseUrl}/wiki/articles/by-slug/${encodeURIComponent(slug)}`)
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
                },
            })
            .pipe(map(mapSuggestionFromDto));
    }

    /**
     * Свои предложения; редактору сервер отдаёт всю очередь.
     *
     * @param status Фильтр по состоянию проверки.
     */
    public suggestions(status?: WikiSuggestionStatus): Observable<WikiSuggestion[]> {
        const query: Record<string, string | number> = { page_size: WikiApiService.MAX_PAGE_SIZE };

        if (status) {
            query['status'] = status;
        }

        return this.http
            .get<WikiSuggestionListDto>(`${this.baseUrl}/wiki/suggestions`, { params: query })
            .pipe(map((response) => (response.suggestions ?? []).map(mapSuggestionFromDto)));
    }

    /**
     * Одобряет предложение.
     *
     * @param id Идентификатор предложения.
     */
    public approveSuggestion(id: string): Observable<WikiSuggestion> {
        return this.http
            .post<WikiSuggestionDto>(`${this.baseUrl}/wiki/suggestions/${encodeURIComponent(id)}/approve`, {})
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
