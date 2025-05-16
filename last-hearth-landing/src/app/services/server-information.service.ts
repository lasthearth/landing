import { UserService } from './user.service';
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { LeaderBoardType } from "./enums/leader-board-type";
import { ILeaderBoard } from "./interface/i-leader-board";
import { IVerifyData } from './interface/i-verify-data';
import { IVerifyRequest } from './interface/i-verify-request';

@Injectable({
    providedIn: "root",
})
export class ServerInformationService {
    private baseUrl = "https://api.lasthearth.ru/v1";

    private readonly http: HttpClient = inject(HttpClient);

    private readonly userService = inject(UserService);

    public getOnlinePlayersCount$(): Observable<{ count: number, max: number }> {
        return this.http.get<{ count: number, max: number }>(
            `${this.baseUrl}/players/count`
        );
    }

    // TODO: [TASK:#15]
    public getTime$(): Observable<{ formatted_time: string }> {
        return this.http.get<{ formatted_time: string }>(
            `${this.baseUrl}/time`
        );
    }

    public getLeaderBoard(type: LeaderBoardType = 0): Observable<{ entries: Array<ILeaderBoard> }> {
        const params = new HttpParams().set('filter', type.toString());

        return this.http.get<{ entries: Array<ILeaderBoard> }>(
            `${this.baseUrl}/leaderboard`, { params }
        );
    }

    public postQuestion(question: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.post<{ question: string }>(`${this.baseUrl}/rules/question`, { question: question }, { headers: headers });
    }

    public getQuestions() {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });

        const params = new HttpParams().set('count', 5);

        return this.http.get<{ questions: Array<{ id: string, question: string }> }>(
            `${this.baseUrl}/rules/questions`, { params, headers: headers }
        );
    }

    public postVerifyUser(data: IVerifyData) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.post<{ verify_request: IVerifyData }>(`${this.baseUrl}/verification`, data, { headers: headers });
    }

    public getVerifyRequests(): Observable<IVerifyRequest[]> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });

        return this.http.get<{ requests: Array<IVerifyRequest> }>(
            `${this.baseUrl}/verifications`, { headers: headers }
        ).pipe(map((data) => data.requests));
    }

    public postVerifySuccess(userId: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.post(`${this.baseUrl}/verification/${userId}/approve`, {}, { headers: headers });
    }

    public postVerifyDeny(userId: string, rejectReason: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.post<{ rejection_reason: string }>(`${this.baseUrl}/verification/${userId}/reject`, { rejection_reason: rejectReason }, { headers: headers });
    }

    public getCode() {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.get<{ code: string }>(
            `${this.baseUrl}/user/verify/code`, { headers: headers }
        );
    }

    public getDetails() {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userService.accessToken}`
        });
        return this.http.get<{
            id: string,
            status: string,
            rejection_reason: string
        }>(
            `${this.baseUrl}/verification/details`, { headers: headers }
        );
    }
}
