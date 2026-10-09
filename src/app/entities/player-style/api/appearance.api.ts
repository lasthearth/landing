import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { AppearanceDto, AppearancesDto, SaveAppearanceRequest, StandingDto } from '../model/appearance.dto';

/**
 * API оформления игроков: список сохранённых видов (публичный), сохранение
 * и сброс своего (для вошедших).
 */
@Injectable({ providedIn: 'root' })
export class AppearanceApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    /**
     * Все сохранённые виды. Ошибка не показывается: без них сайт рисует вид по умолчанию.
     *
     * @returns Сохранённые виды.
     */
    public list(): Observable<AppearanceDto[]> {
        return this.http
            .get<AppearancesDto>(`${this.baseUrl}/appearances`, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((page) => page.appearances ?? []));
    }

    /**
     * Сохраняет свой вид. Сервер проверяет, что всё выбранное открыто.
     *
     * @param body Выбор.
     * @returns Сохранённый вид.
     */
    public save(body: SaveAppearanceRequest): Observable<AppearanceDto> {
        return this.http.put<AppearanceDto>(`${this.baseUrl}/appearances/me`, body);
    }

    /**
     * Своё положение: часы, убийства, смерти, места, поселение, победы в
     * «Голодных играх», приглашённые, события, дни на сервере и покупки.
     *
     * @returns Положение.
     */
    public standing(): Observable<StandingDto> {
        return this.http.get<StandingDto>(`${this.baseUrl}/appearances/me/standing`, {
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        });
    }

    /**
     * Покупает баннер за осколки. Ошибку показывает вызывающий.
     *
     * @param bannerId Баннер.
     * @returns Положение после покупки.
     */
    public buyBanner(bannerId: string): Observable<StandingDto> {
        return this.http.post<StandingDto>(
            `${this.baseUrl}/appearances/banners/${encodeURIComponent(bannerId)}:buy`,
            {},
            { context: new HttpContext().set(SKIP_ERROR_ALERT, true) }
        );
    }

    /**
     * Сбрасывает свой вид к виду по умолчанию.
     *
     * @returns Завершение.
     */
    public reset(): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/appearances/me`);
    }
}
