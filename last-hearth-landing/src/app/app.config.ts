import { NG_EVENT_PLUGINS } from "@taiga-ui/event-plugins";
import { provideAnimations } from "@angular/platform-browser/animations";
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { buildAngularAuthConfig } from '@logto/js';
import { provideAuth } from 'angular-auth-oidc-client';

import { routes } from "./routes/app.routes";
import { provideHttpClient, withFetch } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withFetch()),
        provideAuth({
            config: buildAngularAuthConfig({
                endpoint: 'https://logto.lasthearth.ru/',
                appId: 'u9k3c8kap0lyhhs0o5jn1',
                redirectUri: 'http://lasthearth.ru/home',
                postLogoutRedirectUri: 'http://lasthearth.ru/home',
                scopes: ['openid', 'profile', 'email', 'roles'],
            }),
        }),
        NG_EVENT_PLUGINS,
    ],
};
