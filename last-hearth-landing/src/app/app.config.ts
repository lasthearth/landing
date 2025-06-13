import { NG_EVENT_PLUGINS } from "@taiga-ui/event-plugins";
import { provideAnimations } from "@angular/platform-browser/animations";
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { buildAngularAuthConfig } from '@logto/js';
import { provideAuth } from 'angular-auth-oidc-client';

import { routes } from "./routes/app.routes";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { TUI_VALIDATION_ERRORS } from "@taiga-ui/kit";

function getConfig() {
    const config = buildAngularAuthConfig({
        endpoint: 'https://logto.lasthearth.ru/',
        appId: 'u9k3c8kap0lyhhs0o5jn1',
        redirectUri: 'http://localhost:4200/home',
        postLogoutRedirectUri: 'http://localhost:4200/home',
        scopes: ['openid', 'profile', 'email', 'roles', 'question:create', 'user:verify'],
        resource: 'https://api.lasthearth.ru',
    });

    config.ignoreNonceAfterRefresh = true;
    config.silentRenew = false;

    return config;
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withFetch()),
        provideAuth({
            config: getConfig(),
        }),
        NG_EVENT_PLUGINS,
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
