import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserService } from './user.service';
import { map, Observable, tap } from 'rxjs';
import { ICreateSettlement } from '../settlements/interfaces/i-create-settlement';
import { IRequestSettlement } from '../settlements/interfaces/i-request-settlement';
import { ServerInformationService } from './server-information.service';
import { ISettlement } from '../settlements/interfaces/i-settlement';

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

    public getSettlementTypeByKey(key: string | undefined) {
        switch (key) {
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }
}
