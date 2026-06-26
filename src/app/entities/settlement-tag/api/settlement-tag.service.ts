import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@core/config/environments/environment';
import { ISettlementTag } from '../model/i-settlement-tag';
import { ISettlementTagDto } from '../model/i-settlement-tag-dto';
import { SettlementTagMapper } from '../model/settlement-tag.mapper';

/**
 * API-сервис для управления глобальными тегами поселений.
 */
@Injectable({
    providedIn: 'root',
})
export class SettlementTagService {
    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * HTTP-клиент Angular.
     */
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Возвращает список всех тегов.
     *
     * @returns Observable с массивом тегов.
     */
    public getTags$(): Observable<ISettlementTag[]> {
        return this.http
            .get<{ tags: ISettlementTagDto[] }>(`${this.baseUrl}/settlements/tags`)
            .pipe(map((response) => response.tags.map(SettlementTagMapper.fromDto)));
    }

    /**
     * Возвращает тег по идентификатору.
     *
     * @param tagId Идентификатор тега.
     * @returns Observable с тегом.
     */
    public getTagById$(tagId: string): Observable<ISettlementTag> {
        return this.http
            .get<ISettlementTagDto>(`${this.baseUrl}/settlements/tags/${tagId}`)
            .pipe(map(SettlementTagMapper.fromDto));
    }

    /**
     * Создаёт новый тег.
     *
     * @param tag Данные нового тега.
     * @returns Observable с созданным тегом.
     */
    public createTag$(tag: Omit<ISettlementTag, 'id'>): Observable<ISettlementTag> {
        return this.http
            .post<ISettlementTagDto>(`${this.baseUrl}/settlements/tags`, SettlementTagMapper.toDto(tag))
            .pipe(map(SettlementTagMapper.fromDto));
    }

    /**
     * Удаляет тег (soft-delete).
     *
     * @param tagId Идентификатор удаляемого тега.
     * @returns Observable с результатом операции.
     */
    public deleteTag$(tagId: string): Observable<unknown> {
        return this.http.delete(`${this.baseUrl}/settlements/tags/${tagId}`);
    }

    /**
     * Batch-загрузка тегов по идентификаторам.
     *
     * @param tagIds Массив идентификаторов тегов.
     * @returns Observable с массивом тегов.
     */
    public getTagsByIds$(tagIds: string[]): Observable<ISettlementTag[]> {
        return this.http
            .post<{ tags: ISettlementTagDto[] }>(`${this.baseUrl}/settlements/tags:batch`, { tag_ids: tagIds })
            .pipe(map((response) => response.tags.map(SettlementTagMapper.fromDto)));
    }
}
