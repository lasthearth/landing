import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { buildAngularAuthConfig } from '@logto/js';
import { AbstractSecurityStorage, DefaultLocalStorageService, LogLevel, provideAuth } from 'angular-auth-oidc-client';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { of } from 'rxjs';

import { routes } from '../../routes/app.routes';
import { environment } from './environments/environment';
import { TUI_COPY_TEXTS, TUI_FILE_TEXTS, TUI_VALIDATION_ERRORS } from '@taiga-ui/kit';

/**
 * Формирует конфигурацию OIDC-аутентификации через Logto.
 *
 * @returns Конфигурация angular-auth-oidc-client.
 */
function getConfig() {
    const config = buildAngularAuthConfig({
        endpoint: 'https://logto.lasthearth.ru/',
        appId: 'u9k3c8kap0lyhhs0o5jn1',
        redirectUri: environment.redirectUri,
        postLogoutRedirectUri: environment.postLogoutRedirectUri,
        scopes: [
            'openid',
            'profile',
            'email',
            'roles',
            'question:create',
            'question:list',
            'question:delete',
            'user:verify',
            'settlements:manage',
            'tags:create',
            'tags:delete',
            'tags:manage',
            'donate:coins:add',
            'donate:coins:deduct',
            'donate:shop:create',
            'donate:shop:update',
            'donate:shop:delete',
            'donate:purchase:refund',
            'donate:transaction:list',
            'donate:purchase:list',
            'donate:purchase:issue',
            'donate:wallet:read',
            'kit:assign',
            'kit:list',
            'kit:read',
            'hungergames:match:record',
            'hungergames:season:reset',
            'hungergames:season:create',
            'news:create',
            'news:delete',
            'offline_access',
        ],
        resource: 'https://api.lasthearth.ru',
    });

    config.ignoreNonceAfterRefresh = true;
    config.disableIatOffsetValidation = true;
    config.silentRenew = true;
    config.useRefreshToken = true;
    config.renewTimeBeforeTokenExpiresInSeconds = 120;
    config.logLevel = environment.production ? LogLevel.Warn : LogLevel.Debug;

    return config;
}

/**
 * Глобальная конфигурация приложения Angular.
 *
 * Содержит провайдеры роутинга, HTTP-клиента,
 * анимаций, аутентификации и текстовых констант Taiga UI.
 */
export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideEventPlugins(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
        provideAuth({
            config: getConfig(),
        }),
        {
            provide: AbstractSecurityStorage,
            useClass: DefaultLocalStorageService,
        },
        {
            provide: TUI_VALIDATION_ERRORS,
            useValue: {
                required: 'Вы не заполнили обязательное поле.',
                serverResponse: (errors: string[]) => errors.join('\r\n'),
                minlength: ({ requiredLength }: { requiredLength: string }) =>
                    `Минимальное количество символов должно быть ${requiredLength}.`,
                fileFormat: 'Неверный формат файла.',
                maxFileSize: 'Размер файла превышает допустимый.(2 МБ)',
            },
        },
        {
            provide: TUI_COPY_TEXTS,
            useFactory: () => of(['Копировать', 'Скопировано!'] as const),
        },
        {
            provide: TUI_FILE_TEXTS,
            useValue: of({
                defaultLabel: '',
                failLabel: '',
            }),
        },
    ],
};
