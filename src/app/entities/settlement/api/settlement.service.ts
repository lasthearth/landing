import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { ICreateSettlement } from '../model/i-create-settlement';
import { IRequestSettlement } from '../model/i-request-settlement';
import { ISettlement } from '../model/i-settlement';
import { ISettlementInvitation } from '../model/i-settlement-invitation';
import { IUpdateSettlementRequest } from '../model/i-update-settlement';
import { IJoinRequest } from '../model/i-join-request';
import { Permission } from '../model/permission';
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
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), страницы деградируют к своим error-состояниям.
     *
     * @returns Observable с массивом поселений.
     */
    public getSettlements(): Observable<ISettlement[]> {
        return this.http
            .get<{
                settlements: ISettlement[];
            }>(`${this.baseUrl}/settlements`, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
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
        const params = new HttpParams().set('query', name.trim());

        return this.http.get<{
            users: any[];
        }>(`${this.baseUrl}/users/search`, { params });
    }

    /**
     * Приглашает игрока в поселение.
     *
     * Соответствует `POST /v1/settlements/{settlement_id}/invitations`:
     * обязательные поля `settlement_id` и `user_id` идут и в пути, и в теле —
     * без них бэкенд ответит `INVALID_ARGUMENT`. Ответ пустой
     * (`InviteMemberResponse`), список приглашений перечитывается отдельно.
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор приглашаемого пользователя.
     * @returns Пустой {@link Observable} — признак завершения операции.
     */
    public invitePlayer(settlementId: string, userId: string): Observable<void> {
        return this.http.post<void>(
            `${this.baseUrl}/settlements/${settlementId}/invitations`,
            {
                settlement_id: settlementId,
                user_id: userId,
            }
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
     * @param context Опциональный HTTP-контекст (например, для SKIP_ERROR_ALERT).
     * @returns Observable с массивом приглашений.
     */
    public getSentInvitations(
        settlementId: string,
        context?: HttpContext
    ): Observable<ISettlementInvitation[]> {
        return this.http
            .get<{
                invitations: ISettlementInvitation[];
            }>(`${this.baseUrl}/settlements/${settlementId}/invitations`, { context })
            .pipe(map((data) => data.invitations ?? []));
    }

    /**
     * Отзывает приглашение в поселение.
     *
     * По спеке тело запроса обязательно и повторяет идентификаторы из пути,
     * а ответ содержит актуальный список приглашений поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param invitationId Идентификатор приглашения.
     * @returns Observable с идентификаторами оставшихся приглашений.
     */
    public revokeInvitation(settlementId: string, invitationId: string): Observable<string[]> {
        return this.http
            .post<{
                invitation_ids: string[];
            }>(`${this.baseUrl}/settlements/${settlementId}/invitations/${invitationId}:revoke`, {
                settlement_id: settlementId,
                invitation_id: invitationId,
            })
            .pipe(map((data) => data.invitation_ids ?? []));
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
     * @param context Опциональный HTTP-контекст (например, для SKIP_ERROR_ALERT).
     * @returns Observable со статусом верификации.
     */
    public getRequestSettlementStatus$(userId: string, context?: HttpContext) {
        return this.http.get<{ status: string; rejection_reason: string }>(
            `${this.baseUrl}/users/${userId}/settlements/verification:status`,
            { context }
        );
    }

    // ─── Заявки на вступление (игрок) ───

    /**
     * Подаёт заявку на вступление в поселение.
     *
     * Ответ пустой (`CreateJoinRequestResponse` в спеке — пустая схема),
     * поэтому созданную заявку нужно перечитать через `getMyJoinRequests$`.
     * Ошибки: 409 (уже в поселении/уже подал), 429 (лимит активных заявок), 404.
     *
     * @param settlementId Идентификатор поселения.
     * @returns Observable, завершающийся после создания заявки.
     */
    public createJoinRequest$(settlementId: string): Observable<void> {
        return this.http
            .post<Record<string, never>>(`${this.baseUrl}/settlements/${settlementId}/join-requests`, {
                settlement_id: settlementId,
            })
            .pipe(map(() => undefined));
    }

    /**
     * Отменяет собственную заявку на вступление.
     *
     * @param joinRequestId Идентификатор заявки.
     * @returns Observable с результатом операции.
     */
    public cancelJoinRequest$(joinRequestId: string) {
        return this.http.post(`${this.baseUrl}/settlements/join-requests/${joinRequestId}:cancel`, {
            join_request_id: joinRequestId,
        });
    }

    /**
     * Возвращает собственные заявки пользователя на вступление.
     *
     * @param userId Идентификатор пользователя (только свой).
     * @param context Опциональный HTTP-контекст (например, для SKIP_ERROR_ALERT).
     * @returns Observable с массивом заявок.
     */
    public getMyJoinRequests$(userId: string, context?: HttpContext): Observable<IJoinRequest[]> {
        return this.http
            .get<{
                join_requests: IJoinRequest[];
            }>(`${this.baseUrl}/users/${userId}/settlements/join-requests`, { context })
            .pipe(map((data) => data.join_requests ?? []));
    }

    // ─── Заявки на вступление (сторона поселения) ───

    /**
     * Возвращает список заявок на вступление в поселение.
     * Требует право `PERMISSION_REVIEW_JOIN_REQUEST` или owner.
     *
     * @param settlementId Идентификатор поселения.
     * @param context Опциональный HTTP-контекст (например, для SKIP_ERROR_ALERT).
     * @returns Observable с массивом заявок.
     */
    public getJoinRequests$(settlementId: string, context?: HttpContext): Observable<IJoinRequest[]> {
        return this.http
            .get<{
                join_requests: IJoinRequest[];
            }>(`${this.baseUrl}/settlements/${settlementId}/join-requests`, { context })
            .pipe(map((data) => data.join_requests ?? []));
    }

    /**
     * Одобряет заявку на вступление.
     * 409, если игрок за это время вступил куда-то ещё.
     *
     * @param settlementId Идентификатор поселения.
     * @param joinRequestId Идентификатор заявки.
     * @returns Observable с результатом операции.
     */
    public approveJoinRequest$(settlementId: string, joinRequestId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/join-requests/${joinRequestId}:approve`,
            {}
        );
    }

    /**
     * Отклоняет заявку на вступление.
     *
     * @param settlementId Идентификатор поселения.
     * @param joinRequestId Идентификатор заявки.
     * @returns Observable с результатом операции.
     */
    public rejectJoinRequest$(settlementId: string, joinRequestId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/join-requests/${joinRequestId}:reject`,
            {}
        );
    }

    // ─── Роли (только owner). Все методы возвращают обновлённый Settlement ───

    /**
     * Создаёт роль в поселении.
     * `name` 1-64, без `<`/`>`. Лимит 20 ролей. 400 если `roles_enabled=false`.
     *
     * @param settlementId Идентификатор поселения.
     * @param name Имя роли.
     * @param permissions Список прав роли.
     * @returns Observable с обновлённым поселением.
     */
    public createRole$(
        settlementId: string,
        name: string,
        permissions: Permission[]
    ): Observable<ISettlement> {
        return this.http
            .post<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/roles`, {
                settlement_id: settlementId,
                name,
                permissions,
            })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Обновляет роль поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param roleId Идентификатор роли.
     * @param patch Обновляемые поля роли.
     * @returns Observable с обновлённым поселением.
     */
    public updateRole$(
        settlementId: string,
        roleId: string,
        patch: { name?: string; permissions?: Permission[] }
    ): Observable<ISettlement> {
        return this.http
            .patch<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/roles/${roleId}`, {
                settlement_id: settlementId,
                role_id: roleId,
                ...patch,
            })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Удаляет роль поселения (снимается со всех членов).
     *
     * @param settlementId Идентификатор поселения.
     * @param roleId Идентификатор роли.
     * @returns Observable с обновлённым поселением.
     */
    public deleteRole$(settlementId: string, roleId: string): Observable<ISettlement> {
        return this.http
            .delete<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/roles/${roleId}`)
            .pipe(map((data) => data.settlement));
    }

    /**
     * Выдаёт роль члену поселения. Роль `owner` так выдать нельзя (400).
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор члена.
     * @param roleId Идентификатор роли.
     * @returns Observable с обновлённым поселением.
     */
    public assignMemberRole$(
        settlementId: string,
        userId: string,
        roleId: string
    ): Observable<ISettlement> {
        return this.http
            .post<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/members/${userId}/roles`, {
                settlement_id: settlementId,
                user_id: userId,
                role_id: roleId,
            })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Снимает роль с члена поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор члена.
     * @param roleId Идентификатор роли.
     * @returns Observable с обновлённым поселением.
     */
    public removeMemberRole$(
        settlementId: string,
        userId: string,
        roleId: string
    ): Observable<ISettlement> {
        return this.http
            .delete<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/members/${userId}/roles/${roleId}`)
            .pipe(map((data) => data.settlement));
    }

    // ─── Владение и выход ───

    /**
     * Передаёт владение поселением другому члену.
     * Owner перестаёт быть owner, число owner-ов не растёт.
     *
     * @param settlementId Идентификатор поселения.
     * @param toUserId Идентификатор нового владельца.
     * @returns Observable с обновлённым поселением.
     */
    public transferOwnership$(settlementId: string, toUserId: string): Observable<ISettlement> {
        return this.http
            .post<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/ownership:transfer`, {
                settlement_id: settlementId,
                to_user_id: toUserId,
            })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Выход из поселения.
     * 400, если ты последний owner (сначала передай владение).
     *
     * @param settlementId Идентификатор поселения.
     * @returns Observable с результатом операции.
     */
    public leaveSettlement$(settlementId: string) {
        return this.http.post(`${this.baseUrl}/settlements/${settlementId}:leave`, {});
    }

    // ─── Контакты (только owner) ───

    /**
     * Обновляет контактную информацию поселения (≤512, без `<`/`>`).
     *
     * @param settlementId Идентификатор поселения.
     * @param contactInfo Текст контактной информации.
     * @returns Observable с обновлённым поселением.
     */
    public updateContactInfo$(settlementId: string, contactInfo: string): Observable<ISettlement> {
        return this.http
            .patch<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}/contact-info`, {
                settlement_id: settlementId,
                contact_info: contactInfo,
            })
            .pipe(map((data) => data.settlement));
    }

    // ─── Админка (scope settlements:manage) ───

    /**
     * Добавляет владельца поселению (единственный способ сделать второго равного лидера).
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор нового владельца.
     * @returns Observable с результатом операции.
     */
    public adminAddOwner$(settlementId: string, userId: string) {
        return this.http.post(`${this.baseUrl}/admin/settlements/${settlementId}/owners`, {
            settlement_id: settlementId,
            user_id: userId,
        });
    }

    /**
     * Снимает владельца с поселения. 400 на последнем owner.
     *
     * @param settlementId Идентификатор поселения.
     * @param userId Идентификатор владельца.
     * @returns Observable с результатом операции.
     */
    public adminRemoveOwner$(settlementId: string, userId: string) {
        return this.http.delete(`${this.baseUrl}/admin/settlements/${settlementId}/owners/${userId}`);
    }

    /**
     * Включает или выключает систему ролей поселения.
     * При `false` роли скрыты и не применяются, остаётся только owner.
     *
     * @param settlementId Идентификатор поселения.
     * @param enabled Флаг включения ролей.
     * @returns Observable с результатом операции.
     */
    public adminSetRolesEnabled$(settlementId: string, enabled: boolean) {
        return this.http.post(`${this.baseUrl}/admin/settlements/${settlementId}/roles:set-enabled`, {
            settlement_id: settlementId,
            enabled,
        });
    }

    /**
     * Изменяет дипломатический статус поселения.
     *
     * @param settlementId Идентификатор поселения.
     * @param diplomacy Новый дипломатический статус.
     * @returns Observable с обновлённым поселением.
     */
    public adminUpdateSettlement$(settlementId: string, diplomacy: string): Observable<ISettlement> {
        return this.http
            .patch<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/admin/settlements/${settlementId}`, { diplomacy })
            .pipe(map((data) => data.settlement));
    }

    /**
     * Удаляет поселение (необратимо — показать confirm перед вызовом).
     *
     * @param settlementId Идентификатор поселения.
     * @returns Observable с результатом операции.
     */
    public adminDeleteSettlement$(settlementId: string) {
        return this.http.delete(`${this.baseUrl}/admin/settlements/${settlementId}`);
    }

}
