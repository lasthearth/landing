import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { LeaderBoardType } from "./enums/leader-board-type";
import { ILeaderBoard } from "./interface/i-leader-board";

@Injectable({
    providedIn: "root",
})
export class ServerInformationService {
    private baseUrl = "https://api.lasthearth.ru/v1";

    private readonly http: HttpClient = inject(HttpClient);

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
}
