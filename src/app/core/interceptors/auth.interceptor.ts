import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, switchMap, take, throwError } from 'rxjs';

/**
 * Базовый URL OIDC-эмиттента Logto.
 * Используется для определения запросов к служебным OIDC-ендпоинтам,
 * к которым нельзя добавлять заголовок `Authorization`.
 */
const OIDC_ISSUER = `${environment.logtoEndpoint}/oidc`;

/**
 * Токен контекста HTTP-запроса.
 * Если установлен в `true`, `authInterceptor` не добавляет
 * авторизационный Bearer-токен к запросу.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Проверяет, относится ли URL запроса к OIDC-ендпоинтам Logto.
 *
 * @param url URL исходящего HTTP-запроса.
 * @returns `true`, если запрос направлен к `/oidc/*`.
 */
function isOidcEndpoint(url: string): boolean {
    return url.startsWith(OIDC_ISSUER);
}

/**
 * Проверяет, относится ли URL запроса к сторонним публичным API,
 * для которых не нужен авторизационный Bearer-токен проекта.
 *
 * @param url URL исходящего HTTP-запроса.
 * @returns `true`, если запрос направлен к YouTube Data API.
 */
function isPublicApi(url: string): boolean {
    return url.startsWith('https://www.googleapis.com/youtube/v3');
}

/**
 * HTTP-интерцептор для автоматического добавления авторизационного токена.
 *
 * Получает access token из {@link OidcSecurityService}
 * и добавляет заголовок `Authorization: Bearer <token>` к запросу.
 * Если токен отсутствует, запрос отправляется без изменений.
 *
 * Запросы к OIDC-ендпоинтам Logto (например, `/oidc/token`) пропускаются
 * без добавления токена и без повторной попытки при 401, чтобы не нарушать
 * протокол обмена refresh token и избежать циклических обновлений.
 *
 * При получении 401 на API-запросы пытается обновить сессию через silent renew
 * и повторить запрос один раз.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const oidcSecurityService = inject(OidcSecurityService);

    /**
     * Отправляет запрос с актуальным access-токеном.
     */
    const sendWithToken = () =>
        oidcSecurityService.getAccessToken().pipe(
            take(1),
            switchMap((token) => {
                const authReq = token
                    ? req.clone({
                          setHeaders: {
                              Authorization: `Bearer ${token}`,
                          },
                      })
                    : req;

                return next(authReq);
            })
        );

    if (isOidcEndpoint(req.url) || isPublicApi(req.url) || req.context.get(SKIP_AUTH)) {
        return next(req);
    }

    return sendWithToken().pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                return oidcSecurityService.forceRefreshSession().pipe(
                    take(1),
                    switchMap((loginResponse) => {
                        if (!loginResponse.isAuthenticated) {
                            return throwError(() => error);
                        }

                        return sendWithToken();
                    }),
                    catchError(() => throwError(() => error))
                );
            }

            return throwError(() => error);
        })
    );
};
