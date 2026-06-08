import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { IVerifyData } from '../model/i-verify-data';
import { IVerifyRequest } from '../model/i-verify-request';

/**
 * API-сервис для работы с верификацией игроков.
 *
 * Предоставляет методы для подачи заявки, получения статуса
 * и модерации верификаций.
 */
@Injectable({
    providedIn: 'root',
})
export class VerificationService {
    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * HTTP-клиент Angular.
     */
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Отправляет заявку на верификацию пользователя.
     *
     * @param data Данные для верификации.
     * @returns Observable с результатом операции.
     */
    public postVerifyUser(data: IVerifyData) {
        return this.http.post<{ verify_request: IVerifyData }>(`${this.baseUrl}/verification`, data);
    }

    /**
     * Получает список запросов на верификацию (для администраторов).
     *
     * @returns Observable с массивом запросов на верификацию.
     */
    public getVerifyRequests(): Observable<IVerifyRequest[]> {
        return this.http
            .get<{ requests: Array<IVerifyRequest> }>(`${this.baseUrl}/verifications`)
            .pipe(map((data) => data.requests));
    }

    /**
     * Одобряет верификацию пользователя.
     *
     * @param userId Идентификатор пользователя.
     * @returns Observable с результатом операции.
     */
    public postVerifySuccess(userId: string) {
        return this.http.post(`${this.baseUrl}/verification/${userId}/approve`, {});
    }

    /**
     * Отклоняет верификацию пользователя.
     *
     * @param userId Идентификатор пользователя.
     * @param rejectReason Причина отклонения.
     * @returns Observable с результатом операции.
     */
    public postVerifyDeny(userId: string, rejectReason: string) {
        return this.http.post<{ rejection_reason: string }>(
            `${this.baseUrl}/verification/${userId}/reject`,
            { rejection_reason: rejectReason },
            
        );
    }

    /**
     * Получает код верификации текущего пользователя.
     *
     * @returns Observable с кодом верификации.
     */
    public getCode() {
        return this.http.get<{ code: string }>(`${this.baseUrl}/user/verify/code`);
    }

    /**
     * Получает детали верификации текущего пользователя.
     *
     * @returns Observable с деталями верификации.
     */
    public getDetails() {
        return this.http.get<{
            id: string;
            status: string;
            rejection_reason: string;
        }>(`${this.baseUrl}/verification/details`);
    }
}
