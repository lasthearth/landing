import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { WA_ANIMATION_FRAME } from '@ng-web-apis/common';
import { NEVER } from 'rxjs';
import { serverRoutes } from './app.routes.server';
import { appConfig } from './core/config/app.config';

/**
 * Серверная конфигурация приложения.
 *
 * Режимы рендера задаёт файл серверных роутов: статика собирается заранее,
 * динамические страницы рисуются по запросу.
 */
const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(withRoutes(serverRoutes)),
        // Отключаем анимационный фрейм в SSR-среде — requestAnimationFrame
        // отсутствует в Node.js/Vite SSR и используется Taiga UI.
        { provide: WA_ANIMATION_FRAME, useValue: NEVER },
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
