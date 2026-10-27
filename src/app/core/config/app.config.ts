import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { buildAngularAuthConfig } from '@logto/js';
import { AbstractSecurityStorage, DefaultLocalStorageService, LogLevel, provideAuth } from 'angular-auth-oidc-client';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { serverApiTimeoutInterceptor } from '../interceptors/server-api-timeout.interceptor';
import { of } from 'rxjs';

import { routes } from '../../routes/app.routes';
import { NavPreloadingStrategy } from '../../routes/nav-preloading.strategy';
import { environment } from './environments/environment';
import { TUI_COPY_TEXTS, TUI_FILE_TEXTS, TUI_VALIDATION_ERRORS } from '@taiga-ui/kit';

/**
 * Запросы, ответы на которые не переносятся из серверного рендера в браузер:
 * онлайн на главной и сообщения чата должны приезжать заново.
 */
const FRESH_ON_CLIENT_URLS = ['/serverinfo', '/discord'];

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
            'kit:edit',
            'kit:list',
            'kit:read',
            'hungergames:match:record',
            'hungergames:season:reset',
            'hungergames:season:create',
            'players:nickname:write',
            'players:nickname:grant',
            'news:create',
            'news:delete',
            'offline_access',
            'wiki:write',
            'wiki:review',
        ],
        resource: 'https://api.lasthearth.ru',
    });

    config.ignoreNonceAfterRefresh = true;
    config.disableIatOffsetValidation = true;
    config.silentRenew = true;
    config.useRefreshToken = true;
    config.renewTimeBeforeTokenExpiresInSeconds = 120;
    // Logto возвращает на зарегистрированный /home/?code=…, а сервер сразу
    // переводит этот адрес на /?code=… (один канонический адрес главной).
    // Без этого флага библиотека признаёт колбэком только точный redirectUri
    // и молча не завершает вход. Других параметров code/state на сайте нет.
    config.checkRedirectUrlWhenCheckingIfIsCallback = false;
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
        // `provideAnimationsAsync` здесь не даёт выигрыша: `@taiga-ui/cdk`
        // статически импортирует `@angular/animations/browser` в
        // `TUI_REMOVED_ELEMENT`, поэтому движок всё равно оказывается
        // в начальном графе.
        provideAnimations(),
        // Пререндеренная разметка переиспользуется, а не строится заново:
        // без гидратации страница «схлопывалась» и раскрывалась (CLS ~0.7).
        // Ответы API, запрошенные при серверном рендере, переносятся в браузер:
        // страница не запрашивает те же данные второй раз. Онлайн и чат должны
        // быть свежими, поэтому их запросы в перенос не попадают.
        provideClientHydration(
            withEventReplay(),
            withHttpTransferCacheOptions({
                filter: (request) => !FRESH_ON_CLIENT_URLS.some((part) => request.url.includes(part)),
            })
        ),
        provideEventPlugins(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(
            routes,
            // При переходе страница открывается сверху, «Назад» возвращает прежнюю позицию,
            // ссылки с #якорем прокручивают к элементу.
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
            // Чанки разделов меню скачиваются в фоне, чтобы клик не ждал сеть.
            withPreloading(NavPreloadingStrategy)
        ),
        // Ограничение ожидания API при серверном рендере стоит первым: оно
        // не даёт серверу ждать недоступный API и заменяет ошибку на пустой ответ
        // раньше, чем до дела дойдёт показ уведомлений.
        provideHttpClient(
            withFetch(),
            withInterceptors([serverApiTimeoutInterceptor, authInterceptor, errorInterceptor])
        ),
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
