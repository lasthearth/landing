import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { CreateNewsRequest, NewsDto, NewsViewResponse } from '../model/news.types';

/**
 * API-сервис для работы с новостями.
 *
 * Предоставляет методы для получения списка, создания и удаления новостей.
 */
@Injectable({
    providedIn: 'root',
})
export class NewsApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Сколько живёт общий кэш списка новостей.
     * Список запрашивают главная, баннер объявлений, страница новости и анкета —
     * без кэша на одной загрузке страницы уходило несколько одинаковых запросов по 50 записей.
     */
    private static readonly LIST_CACHE_MS = 60_000;

    /**
     * Общий поток списка новостей (последний ответ раздаётся всем подписчикам).
     */
    private listCache: Observable<NewsDto[]> | null = null;

    /**
     * Время запуска запроса, лежащего в кэше.
     */
    private listCachedAt = 0;

    /**
     * Получает список всех новостей.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), потребитель деградирует к пустому списку.
     *
     * @returns Observable с массивом DTO новостей.
     */
    getList(): Observable<NewsDto[]> {
        const now = Date.now();

        if (!this.listCache || now - this.listCachedAt > NewsApiService.LIST_CACHE_MS) {
            this.listCachedAt = now;
            this.listCache = this.http
                .get<{ news: NewsDto[] }>(`${this.baseUrl}/news`, {
                    // По умолчанию API отдаёт 15 записей; 50 — максимум по контракту.
                    params: { page_size: 50 },
                    context: new HttpContext().set(SKIP_ERROR_ALERT, true),
                })
                .pipe(
                    map((response) => response.news),
                    tap({ error: () => (this.listCache = null) }),
                    shareReplay({ bufferSize: 1, refCount: false })
                );
        }

        return this.listCache;
    }

    /**
     * Получает самую свежую новость (лёгкий запрос на одну запись).
     *
     * Нужен, чтобы понять, появилось ли что-то новое, не скачивая всю ленту.
     * Ошибка не показывается пользователю.
     *
     * @returns Observable со свежей новостью или `null`, если новостей нет.
     */
    getLatest(): Observable<NewsDto | null> {
        return this.http
            .get<{ news: NewsDto[] }>(`${this.baseUrl}/news`, {
                params: { page_size: 1 },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((response) => response.news?.[0] ?? null));
    }

    /**
     * Получает новость по идентификатору.
     *
     * @param id Идентификатор новости.
     * @returns Observable с DTO новости.
     */
    getById(id: string): Observable<NewsDto> {
        return this.http.get<NewsDto>(`${this.baseUrl}/news/${id}`, {
            // Отсутствие новости страница обрабатывает сама — без всплывающей ошибки.
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Создаёт новую новость.
     *
     * @param request Данные для создания новости.
     * @returns Observable с созданной новостью.
     */
    create(request: CreateNewsRequest): Observable<NewsDto> {
        return this.http.post<NewsDto>(`${this.baseUrl}/news`, request).pipe(tap(() => (this.listCache = null)));
    }

    /**
     * Удаляет новость по идентификатору.
     *
     * @param id Идентификатор новости для удаления.
     * @returns Observable с пустым результатом.
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/news/${id}`).pipe(tap(() => (this.listCache = null)));
    }

    /**
     * Регистрирует просмотр новости авторизованным пользователем.
     *
     * Увеличивает счётчик просмотров один раз для одного пользователя.
     * Ошибки обрабатываются вызывающим кодом без показа уведомлений.
     *
     * @param id Идентификатор новости.
     * @returns Observable с актуальным количеством просмотров.
     */
    addView(id: string): Observable<number> {
        return this.http
            .post<NewsViewResponse>(
                `${this.baseUrl}/news/${id}/views`,
                {},
                { context: new HttpContext().set(SKIP_ERROR_ALERT, true) }
            )
            .pipe(map((response) => parseInt(response.view_count, 10) || 0));
    }
}
