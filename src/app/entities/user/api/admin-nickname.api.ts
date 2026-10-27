import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import {
    IAdminChangeNicknameRequest,
    IAdminChangeNicknameResponse,
    IAdminGrantNicknameChangeRequest,
} from '../model/admin-nickname.dto';

/**
 * API административного управления ником игрока.
 *
 * Две операции, у каждой свой скоуп:
 * - `AdminChangeNickname` (`PUT /admin/users/{user_id}/nickname`,
 *   скоуп `players:nickname:write`) — принудительно меняет ник, минуя кулдаун;
 *   игрок получает уведомление с причиной, стартует новый кулдаун 6 месяцев;
 * - `AdminGrantNicknameChange` (`POST /admin/users/{user_id}/nickname:grant`,
 *   скоуп `players:nickname:grant`) — ник не меняет, а снимает кулдаун,
 *   чтобы игрок сменил ник сам в профиле.
 */
@Injectable({ providedIn: 'root' })
export class AdminNicknameApiService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Принудительно меняет ник игроку (скоуп `players:nickname:write`).
     *
     * @param request Идентификатор игрока, новый ник и необязательная причина.
     * @returns Старый и новый ник и дата окончания нового кулдауна.
     */
    public changeNickname$(request: IAdminChangeNicknameRequest): Observable<IAdminChangeNicknameResponse> {
        return this.http.put<IAdminChangeNicknameResponse>(
            `${this.baseUrl}/admin/users/${request.user_id}/nickname`,
            request
        );
    }

    /**
     * Разрешает игроку сменить ник досрочно (скоуп `players:nickname:grant`).
     *
     * Ник не меняется: сервер снимает запись о последней смене, и обычная
     * смена ника игроком снова проходит проверку кулдауна. Grant при
     * отсутствующем кулдауне сервер отвергает `FAILED_PRECONDITION`.
     *
     * @param request Идентификатор игрока и необязательная причина.
     * @returns Пустой объект при успехе.
     */
    public grantNicknameChange$(request: IAdminGrantNicknameChangeRequest): Observable<Record<string, never>> {
        return this.http.post<Record<string, never>>(
            `${this.baseUrl}/admin/users/${request.user_id}/nickname:grant`,
            request
        );
    }
}
