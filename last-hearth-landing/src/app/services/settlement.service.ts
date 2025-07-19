import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserService } from './user.service';
import { map, Observable } from 'rxjs';
import { ICreateSettlement } from '../settlements/interfaces/i-create-settlement';
import { IRequestSettlement } from '../settlements/interfaces/i-request-settlement';
import { ServerInformationService } from './server-information.service';
import { ISettlement } from '../settlements/interfaces/i-settlement';

@Injectable({
    providedIn: 'root'
})
export class SettlementService {
    private readonly baseUrl = "https://api.lasthearth.ru/v1";

    private readonly http: HttpClient = inject(HttpClient);

    private readonly userService = inject(UserService);

    private readonly serverInfoService = inject(ServerInformationService);

    /**
     * Создает запрос на основание поселения.
     *
     * @param settlement Объект данных о селении.
     */
    public postRequestSettlement$(settlement: ICreateSettlement): Observable<ICreateSettlement> {
        return this.http.post<ICreateSettlement>(
            `${this.baseUrl}/settlements`,
            settlement,
            { headers: this.serverInfoService.getHeaders() }
        );
    }

    /**
     * Возвращает список селений, которые ожидают верификации.
     */
    public getSettlementsRequests$(): Observable<IRequestSettlement[]> {
        return this.http.get<{ settlements: Array<IRequestSettlement> }>(
            `${this.baseUrl}/settlements/verifications`, { headers: this.serverInfoService.getHeaders() }
        ).pipe(map((data) => data.settlements));
    }

    /**
     *  Одобряет запрос на создание поселения.
     *
     *  @param settlementId Идентификатор селения.
     */
    public postVerifySettlementApprove(settlementId: string) {
        return this.http.post(`${this.baseUrl}/settlements/${settlementId}/verification:approve`, {}, { headers: this.serverInfoService.getHeaders() });
    }

    /**
     *  Отклоняет запрос на создание поселения.
     *
     *  @param settlementId Идентификатор селения.
     */
    public postVerifySettlementReject(settlementId: string, rejectReason: string) {
        return this.http.post(`${this.baseUrl}/settlements/${settlementId}/verification:reject`, { rejection_reason: rejectReason }, { headers: this.serverInfoService.getHeaders() });
    }

    public getSettlementInfo(userId: string): Observable<ISettlement> {
        return this.http.get<{ settlement: ISettlement }>(
            `${this.baseUrl}/user/${userId}/settlements`, { headers: this.serverInfoService.getHeaders() }
        ).pipe(map((data) => data.settlement));;
    }
}
