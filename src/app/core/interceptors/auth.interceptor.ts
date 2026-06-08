import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { switchMap, take } from 'rxjs';

/**
 * HTTP-интерцептор для автоматического добавления авторизационного токена.
 *
 * Получает access token из {@link OidcSecurityService}
 * и добавляет заголовок `Authorization: Bearer <token>` к запросу.
 * Если токен отсутствует, запрос отправляется без изменений.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const oidcSecurityService = inject(OidcSecurityService);

    return oidcSecurityService.getAccessToken().pipe(
        take(1),
        switchMap((token) => {
            if (token) {
                req = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }

            return next(req);
        })
    );
};
