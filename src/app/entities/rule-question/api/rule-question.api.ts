import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { RuleQuestionDto } from '../model/rule-question.types';

/**
 * API-сервис для работы с вопросами правил.
 *
 * Предоставляет методы для получения списка, случайных вопросов,
 * создания и удаления вопросов.
 */
@Injectable({
    providedIn: 'root',
})
export class RuleQuestionApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Получает полный список вопросов для администратора.
     *
     * Использует эндпоинт GET /rules/questions/list.
     *
     * @returns Observable с массивом DTO вопросов.
     */
    getList(): Observable<RuleQuestionDto[]> {
        return this.http
            .get<{ questions: RuleQuestionDto[] }>(
                `${this.baseUrl}/rules/questions/list`
            )
            .pipe(map((response) => response.questions));
    }

    /**
     * Получает случайные вопросы для верификации игрока.
     *
     * Использует эндпоинт GET /rules/questions.
     *
     * @param count Количество вопросов (по умолчанию 5).
     * @returns Observable с массивом DTO вопросов.
     */
    getRandom(count: number = 5): Observable<RuleQuestionDto[]> {
        const params = new HttpParams().set('count', count.toString());

        return this.http
            .get<{ questions: RuleQuestionDto[] }>(
                `${this.baseUrl}/rules/questions`,
                { params }
            )
            .pipe(map((response) => response.questions));
    }

    /**
     * Создаёт новый вопрос для верификации.
     *
     * @param question Текст вопроса.
     * @returns Observable с созданным вопросом.
     */
    create(question: string): Observable<RuleQuestionDto> {
        return this.http.post<RuleQuestionDto>(
            `${this.baseUrl}/rules/question`,
            { question }
        );
    }

    /**
     * Удаляет вопрос по идентификатору.
     *
     * @param id Идентификатор вопроса для удаления.
     * @returns Observable с пустым результатом.
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(
            `${this.baseUrl}/rules/question/${id}`
        );
    }
}
