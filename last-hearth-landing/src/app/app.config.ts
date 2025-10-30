import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { buildAngularAuthConfig } from '@logto/js';
import { provideAuth } from 'angular-auth-oidc-client';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { routes } from "./routes/app.routes";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { TUI_VALIDATION_ERRORS } from "@taiga-ui/kit";

function getConfig() {
    const config = buildAngularAuthConfig({
        endpoint: 'https://logto.lasthearth.ru/',
        appId: 'u9k3c8kap0lyhhs0o5jn1',
        redirectUri: 'https://lasthearth.ru/home',
        postLogoutRedirectUri: 'https://lasthearth.ru/home',
        scopes: ['openid', 'profile', 'email', 'roles', 'question:create', 'user:verify', 'settlements:manage'],
        resource: 'https://api.lasthearth.ru',
    });

    config.ignoreNonceAfterRefresh = true;
    config.silentRenew = false;

    return config;
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideEventPlugins(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideAuth({
            config: getConfig(),
        }),
        provideRouter(routes),
        provideHttpClient(withFetch()),
        {
            provide: TUI_VALIDATION_ERRORS,
            useValue: {
                required: 'Вы не заполнили обязательное поле.',
                serverResponse: (errors: string[]) => errors.join('\r\n'),
                minlength: ({ requiredLength }: { requiredLength: string }) => `Минимальное количество символов должно быть ${requiredLength}.`,
            },
        },
    ],
};
