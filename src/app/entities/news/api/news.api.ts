import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { NewsDto, CreateNewsRequest } from '../model/news.types';

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
     * Получает список всех новостей.
     *
     * @returns Observable с массивом DTO новостей.
     */
    getList(): Observable<NewsDto[]> {
        return this.http
            .get<{ news: NewsDto[] }>(`${this.baseUrl}/news`)
            .pipe(map((response) => response.news));
    }

    /**
     * Получает новость по идентификатору.
     *
     * @param id Идентификатор новости.
     * @returns Observable с DTO новости.
     */
    getById(id: string): Observable<NewsDto> {
        return this.http.get<NewsDto>(`${this.baseUrl}/news/${id}`);
    }

    /**
     * Создаёт новую новость.
     *
     * @param request Данные для создания новости.
     * @returns Observable с созданной новостью.
     */
    create(request: CreateNewsRequest): Observable<NewsDto> {
        return this.http.post<NewsDto>(`${this.baseUrl}/news`, request);
    }

    /**
     * Удаляет новость по идентификатору.
     *
     * @param id Идентификатор новости для удаления.
     * @returns Observable с пустым результатом.
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/news/${id}`);
    }
}
