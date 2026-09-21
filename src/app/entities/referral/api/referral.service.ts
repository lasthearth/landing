import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { IGetMyReferralCodeResponse } from '../model/referral-code-response.interface';
import { IGetMyReferralStatsResponse } from '../model/referral-stats-response.interface';
import { IUseReferralCodeRequest } from '../model/use-referral-code-request.interface';

/**
 * API-сервис для работы с реферальной программой.
 *
 * Предоставляет методы для получения собственного реферального кода,
 * просмотра статистики приглашённых игроков и применения чужого кода.
 */
@Injectable({
    providedIn: 'root',
})
export class ReferralService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Возвращает реферальный код текущего игрока.
     * При первом вызове код генерируется автоматически на стороне сервера.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), виджет деградирует к пустому состоянию.
     *
     * @returns Observable с реферальным кодом.
     */
    public getMyCode$(): Observable<IGetMyReferralCodeResponse> {
        return this.http.get<IGetMyReferralCodeResponse>(`${this.baseUrl}/referral/my-code`, {
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Возвращает статистику реферальной программы текущего игрока.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), виджет деградирует к нулевой статистике.
     *
     * @returns Observable с количеством рефералов и заработанных монет.
     */
    public getMyStats$(): Observable<IGetMyReferralStatsResponse> {
        return this.http.get<IGetMyReferralStatsResponse>(`${this.baseUrl}/referral/my-stats`, {
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Применяет реферальный код к текущему игроку.
     *
     * @param code Реферальный код для применения.
     * @returns Observable с пустым результатом операции.
     */
    public useCode$(code: string): Observable<unknown> {
        const body: IUseReferralCodeRequest = { code };

        return this.http.post<unknown>(`${this.baseUrl}/referral/use`, body);
    }
}
