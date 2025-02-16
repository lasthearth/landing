import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ServerInformationService {

    private baseUrl = 'http://85.28.47.225:6969/v1';

    private readonly http: HttpClient = inject(HttpClient);

    public getOnlinePlayersCount(): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.baseUrl}/players/count`);
    }

}
