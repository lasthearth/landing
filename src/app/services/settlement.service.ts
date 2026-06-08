import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserService } from './user.service';
import { map, Observable, tap } from 'rxjs';
import { ICreateSettlement } from '../settlements/interfaces/i-create-settlement';
import { IRequestSettlement } from '../settlements/interfaces/i-request-settlement';
import { ServerInformationService } from './server-information.service';
import { ISettlement } from '../settlements/interfaces/i-settlement';
import { Tag } from '@app/profile/admin/moderate-settlement-request/interfaces/tag.interface';

@Injectable({
    providedIn: 'root',
})
export class SettlementService {
    private readonly baseUrl = 'https://apiprev.lasthearth.ru/v1';

    private readonly http: HttpClient = inject(HttpClient);

    private readonly serverInfoService = inject(ServerInformationService);

    /**
     * Создает запрос на основание поселения.
     *
     * @param settlement Объект данных о селении.
     */
    public postRequestSettlement$(settlement: ICreateSettlement): Observable<ICreateSettlement> {
        return this.http.post<ICreateSettlement>(`${this.baseUrl}/settlements`, settlement, {
            headers: this.serverInfoService.getHeaders(),
        });
    }

    /**
     * Возвращает список селений, которые ожидают верификации.
     */
    public getSettlementsRequests$(): Observable<IRequestSettlement[]> {
        return this.http
            .get<{
                settlements: Array<IRequestSettlement>;
            }>(`${this.baseUrl}/settlements/verifications`, { headers: this.serverInfoService.getHeaders() })
            .pipe(map((data) => data.settlements));
    }

    /**
     *  Одобряет запрос на создание поселения.
     *
     *  @param settlementId Идентификатор селения.
     */
    public postVerifySettlementApprove(settlementId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/verification:approve`,
            {},
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    /**
     *  Отклоняет запрос на создание поселения.
     *
     *  @param settlementId Идентификатор селения.
     */
    public postVerifySettlementReject(settlementId: string, rejectReason: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/verification:reject`,
            { rejection_reason: rejectReason },
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    public getSettlementInfo(userId: string): Observable<ISettlement> {
        return this.http
            .get<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/users/${userId}/settlements`, { headers: this.serverInfoService.getHeaders() })
            .pipe(map((data) => data.settlement));
    }

    public getSettlements(): Observable<ISettlement[]> {
        return this.http
            .get<{
                settlements: ISettlement[];
            }>(`${this.baseUrl}/settlements`, { headers: this.serverInfoService.getHeaders() })
            .pipe(map((data) => data.settlements));
    }

    public getSettlementById(settlementId: string) {
        return this.http
            .get<{
                settlement: ISettlement;
            }>(`${this.baseUrl}/settlements/${settlementId}`, { headers: this.serverInfoService.getHeaders() })
            .pipe(map((data) => data.settlement));
    }

    public searchUser$(name: string) {
        const params = new HttpParams().set('query', name);

        return this.http.get<{
            users: any[];
        }>(`${this.baseUrl}/users/search`, { params, headers: this.serverInfoService.getHeaders() });
    }

    public invitePlayer(settlementId: string, userId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/${settlementId}/invitations`,
            {
                settlement_id: settlementId,
                user_id: userId,
            },
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    public inviteAccept(invitationId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/invitations/${invitationId}:accept`,
            {},
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    public rejectAccept(invitationId: string) {
        return this.http.post<{
            users: any[];
        }>(
            `${this.baseUrl}/settlements/invitations/${invitationId}:reject`,
            {},
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    public settlementLeave$(settlementId: string, userId: string) {
        return this.http.delete(`${this.baseUrl}/settlements/${settlementId}/members/${userId}`, {
            headers: this.serverInfoService.getHeaders(),
        });
    }

    public getSettlementTypeByKey(key: string | undefined) {
        switch (key) {
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }

    private tagsIds: Record<string, Tag> = {
        '6936e810061b4fa4e3467319': {
            id: '6936e810061b4fa4e3467319',
            text: 'Восток',
            action: 'add',
            type: 'east',
            unique: true,
            disabled: false,
        },
        '6936e848061b4fa4e346731a': {
            id: '6936e848061b4fa4e346731a',
            text: 'Запад',
            action: 'add',
            type: 'west',
            unique: true,
            disabled: false,
        },
        '6936e858061b4fa4e346731b': {
            id: '6936e858061b4fa4e346731b',
            text: 'Сюзерен',
            action: 'add',
            type: 'suzerain',
            disabled: false,
        },
    };

    public postSettlementTags(tagId: string, settlementId: string) {
        return this.http.post(
            `${this.baseUrl}/settlements/${settlementId}/tags`,
            { settlement_id: settlementId, tag_id: tagId },
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    public getRequestSettlementStatus$(userId: string) {
        return this.http
            .get<{ status: string; rejection_reason: string }>(
                `${this.baseUrl}/users/${userId}/settlements/verification:status`,
                {
                    headers: this.serverInfoService.getHeaders(),
                }
            )
            .pipe();
    }

    public getTagById(tagId: string): Tag | undefined {
        const tag = this.tagsIds[tagId];
        return tag ? { ...tag } : undefined;
    }
}
