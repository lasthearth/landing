import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Точка входа для серверного рендеринга.
 * Используется для prerender статичных страниц.
 *
 * @param context Контекст серверной платформы, передаваемый Angular SSR.
 * @returns Promise с загруженным приложением.
 */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
