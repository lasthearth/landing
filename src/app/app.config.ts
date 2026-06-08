import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { buildAngularAuthConfig } from '@logto/js';
import { provideAuth } from 'angular-auth-oidc-client';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { of } from 'rxjs';

import { routes } from './routes/app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TUI_VALIDATION_ERRORS, TUI_COPY_TEXTS, TUI_FILE_TEXTS } from '@taiga-ui/kit';
import { environment } from '../environments/environment';

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
            'user:verify',
            'settlements:manage',
            'tags:create',
            'tags:delete',
            'tags:manage',
        ],
        resource: 'https://api.lasthearth.ru',
    });

    config.ignoreNonceAfterRefresh = true;
    config.silentRenew = false;
    config.disableIatOffsetValidation = true;

    return config;
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideEventPlugins(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withFetch()),
        provideAuth({
            config: getConfig(),
        }),
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
