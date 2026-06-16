import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { WA_ANIMATION_FRAME } from '@ng-web-apis/common';
import { NEVER } from 'rxjs';
import { appConfig } from './core/config/app.config';

/**
 * Серверная конфигурация приложения.
 * Используется для prerender статичных страниц.
 */
const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(),
        // Отключаем анимационный фрейм в SSR-среде — requestAnimationFrame
        // отсутствует в Node.js/Vite SSR и используется Taiga UI.
        { provide: WA_ANIMATION_FRAME, useValue: NEVER },
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
