import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { ICreateSettlement } from '../model/i-create-settlement';
import { IRequestSettlement } from '../model/i-request-settlement';
import { ISettlement } from '../model/i-settlement';
import { ISettlementInvitation } from '../model/i-settlement-invitation';
import { IUpdateSettlementRequest } from '../model/i-update-settlement';
/**
 * API-сервис для работы с поселениями.
 *
 * Предоставляет методы для создания, получения, модерации
 * и управления членами и тегами поселений.
 */
@Injectable({
    providedIn: 'root',
})
export class SettlementService {
    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * HTTP-клиент Angular.
     */
    private readonly http: HttpClient = inject(HttpClient);

    /**
     * Создает запрос на основание поселения.
     *
     * @param settlement Объект данных о селении.
     * @returns Observable с созданным поселением.
     */
    public postRequestSettlement$(settlement: ICreateSettlement): Observable<ICreateSettlement> {
        return this.http.post<ICreateSettlement>(`${this.baseUrl}/settlements`, settlement);
    }

    /**
     * Возвращает список селений, которые ожидают верификации.
     *
     * @returns Observable с массивом запросов на поселение.
     */
    public getSettlementsRequests$(): Observable<IRequestSettlement[]> {
        return this.http
            .get<{
                settlements: Array<IRequestSettlement>;
            }>(`${this.baseUrl}/settlements/verifications`)
            .pipe(map((data) => data.settlements));
    }

    /**
     * Одобряет запрос на создание поселения.
     *
     * @param settlementId Идентификатор селения.
     * @returns Observable с результатом операции.
     */
    public postVerifySettlementApprove(settlementId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/verification:approve`,
            {},
            
        );
    }

    /**
     * Отклоняет запрос на создание поселения.
     *
     * @param settlementId Идентификатор селения.
     * @param rejectReason Причина отклонения.
     * @returns Observable с результатом операции.
     */
    public postVerifySettlementReject(settlementId: string, rejectReason: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/verification:reject`,
            { rejection_reason: rejectReason },
            
        );
    }

    /**
     * Получает информацию о поселении пользователя.
     *
     * @param userId Идентификатор пользователя.
     * @param context Опциональный HTTP-контекст (например, для SKIP_ERROR_ALERT).
     * @returns Observable с данными поселения.
     */
    public getSettlementInfo(userId: string, context?: HttpContext): Observable<ISettlement> {
        return this.http
            .get<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/users/${userId}/settlements`, { context })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Получает список всех поселений.
     *
     * @returns Observable с массивом поселений.
     */
    public getSettlements(): Observable<ISettlement[]> {
        return this.http
            .get<{
                settlements: ISettlement[];
            }>(`${this.baseUrl}/settlements`)
            .pipe(map((data) => data.settlements));
    }

    /**
     * Получает поселение по идентификатору.
     *
     * @param settlementId Идентификатор поселения.
     * @returns Observable с данными поселения.
     */
    public getSettlementById(settlementId: string): Observable<ISettlement> {
        return this.http
            .get<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}`)
            .pipe(map((data) => data.settlement));
    }

    /**
     * Обновляет данные поселения.
     *
     * Доступно только лидеру поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param request Данные для обновления.
     * @returns Observable с обновлённым поселением.
     */
    public updateSettlement$(
        settlementId: string,
        request: IUpdateSettlementRequest
    ): Observable<ISettlement> {
        return this.http
            .patch<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}`, request)
            .pipe(map((data) => data.settlement));
    }

    /**
     * Выполняет поиск пользователей по имени.
     *
     * @param name Имя для поиска.
     * @returns Observable с результатами поиска.
     */
    public searchUser$(name: string) {
        const params = new HttpParams().set('query', name);

        return this.http.get<{
            users: any[];
        }>(`${this.baseUrl}/users/search`, { params });
    }

    /**
     * Приглашает игрока в поселение.
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор пользователя.
     * @returns Observable с результатом операции.
     */
    public invitePlayer(settlementId: string, userId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/${settlementId}/invitations`,
            {
                settlement_id: settlementId,
                user_id: userId,
            },
            
        );
    }

    /**
     * Принимает приглашение в поселение.
     *
     * @param invitationId Идентификатор приглашения.
     * @returns Observable с результатом операции.
     */
    public inviteAccept(invitationId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/invitations/${invitationId}:accept`,
            {},
            
        );
    }

    /**
     * Отклоняет приглашение в поселение.
     *
     * @param invitationId Идентификатор приглашения.
     * @returns Observable с результатом операции.
     */
    public rejectAccept(invitationId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/invitations/${invitationId}:reject`,
            {},
            
        );
    }

    /**
     * Получает список отправленных приглашений для поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @returns Observable с массивом приглашений.
     */
    public getSentInvitations(settlementId: string): Observable<ISettlementInvitation[]> {
        return this.http
            .get<{
                invitations: ISettlementInvitation[];
            }>(`${this.baseUrl}/settlements/${settlementId}/invitations`)
            .pipe(map((data) => data.invitations));
    }

    /**
     * Отзывает приглашение в поселение.
     *
     * @param settlementId Идентификатор поселения.
     * @param invitationId Идентификатор приглашения.
     * @returns Observable с результатом операции.
     */
    public revokeInvitation(settlementId: string, invitationId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/invitations/${invitationId}:revoke`,
            {},
            
        );
    }

    /**
     * Исключает пользователя из поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор пользователя.
     * @returns Observable с результатом операции.
     */
    public settlementLeave$(settlementId: string, userId: string) {
        return this.http.delete(`${this.baseUrl}/settlements/${settlementId}/members/${userId}`);
    }

    /**
     * Возвращает локализованное название типа поселения по ключу.
     *
     * @param key Ключ типа поселения.
     * @returns Локализованное название.
     */
    public getSettlementTypeByKey(key: string | number | undefined) {
        switch (key) {
            case 1:
            case 'CITY':
                return 'Город';
            case 2:
            case 'FORTRESS':
                return 'Крепость';
            case 3:
            case 'CAPITAL':
                return 'Столица';
            case 0:
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }

    /**
     * Добавляет тег к поселению.
     *
     * @param tagId Идентификатор тега.
     * @param settlementId Идентификатор поселения.
     * @returns Observable с результатом операции.
     */
    public postSettlementTags(tagId: string, settlementId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/tags`,
            { settlement_id: settlementId, tag_id: tagId },
            
        );
    }

    /**
     * Удаляет тег из поселения.
     *
     * @param tagId Идентификатор тега.
     * @param settlementId Идентификатор поселения.
     * @returns Observable с результатом операции.
     */
    public removeTagFromSettlement$(tagId: string, settlementId: string) {
        return this.http.delete(`${this.baseUrl}/settlements/${settlementId}/tags/${tagId}`);
    }

    /**
     * Получает статус верификации поселения пользователя.
     *
     * @param userId Идентификатор пользователя.
     * @returns Observable со статусом верификации.
     */
    public getRequestSettlementStatus$(userId: string) {
        return this.http.get<{ status: string; rejection_reason: string }>(
            `${this.baseUrl}/users/${userId}/settlements/verification:status`,
            {
            }
        );
    }

}
