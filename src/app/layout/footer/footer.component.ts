import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '@core/config/environments/environment';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RevealDirective } from '@shared/lib/directives';
import { TranslatePipe } from '@core/i18n';
import { FOOTER_NAV_LINKS } from './config/footer-nav-links.constant';
import { FOOTER_SOCIAL_LINKS } from './config/footer-social-links.constant';

/**
 * Компонент подвала «Врата очага».
 *
 * Подвал — тёмный зал портала: верхняя кромка — прямая линия жара в 2px, над
 * ней в щель страницы уходит мягкий ореол, внутри зала от линии поднимаются
 * и гаснут угли, по линии скользит импульс жара. Движение — циклы CSS ореола,
 * линии и углей; скрипт прокрутки подвалу не нужен. При
 * `prefers-reduced-motion` циклы стоят в видимом состоянии, ничего не спрятано.
 */
@Component({
    selector: 'app-footer',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent, RevealDirective],
    templateUrl: `./footer.component.html`,
    styleUrl: `./footer.component.less`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
    protected readonly environment = environment;

    /**
     * Ссылки на публичные разделы сайта.
     */
    protected readonly navLinks = FOOTER_NAV_LINKS;

    /**
     * Внешние каналы проекта.
     */
    protected readonly socialLinks = FOOTER_SOCIAL_LINKS;

    /**
     * Путь к логотипу в `public`.
     */
    protected readonly logoSrc = '/images/logo.webp';

    /**
     * Строка копирайта.
     */
    protected readonly copyright = '© lasthearth.ru 2025-2026';

    /**
     * Адрес документации: стоит за строкой версии.
     */
    protected readonly docsUrl = 'https://docs.lasthearth.ru/';
}
