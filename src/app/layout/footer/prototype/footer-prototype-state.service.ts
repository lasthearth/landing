import { Injectable, signal } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { FOOTER_NAV_LINKS } from '../config/footer-nav-links.constant';
import { FooterSocialLink } from './model/footer-social-link.interface';

/**
 * Данные подвала для прототипа.
 *
 * Единственный источник правды для всех вариантов: ссылки разделов берутся
 * из боевого конфига, адреса версий и приглашения — из окружения, адреса
 * внешних каналов повторяют боевой подвал и собраны здесь одним списком.
 * Объявляется в провайдерах хоста `FooterPrototypeComponent`.
 */
@Injectable()
export class FooterPrototypeState {
    /**
     * Разделы сайта: те же маршруты и ключи словаря, что в боевом подвале.
     */
    public readonly navLinks = signal(FOOTER_NAV_LINKS);

    /**
     * Внешние каналы проекта. Адреса повторяют боевой подвал: других
     * источников у этих ссылок в проекте нет.
     */
    public readonly socialLinks = signal<readonly FooterSocialLink[]>([
        { url: 'https://boosty.to/lisov', icon: '/images/Boosty.svg', labelKey: 'footer.social.boosty' },
        {
            url: 'https://www.donationalerts.com/r/lisovn',
            icon: '/images/DA.svg',
            labelKey: 'footer.social.donationAlerts',
        },
        {
            url: environment.discordInviteUrl,
            icon: '/images/discord.svg',
            labelKey: 'footer.social.discord',
            isSmallIcon: true,
        },
        {
            url: 'https://www.youtube.com/@LISOVCORP',
            icon: '/images/youtube.svg',
            labelKey: 'footer.social.youtube',
            isSmallIcon: true,
        },
    ]);

    /**
     * Приглашение в Discord: адрес CTA «Вступить в Discord».
     */
    public readonly discordInviteUrl = signal(environment.discordInviteUrl);

    /**
     * Путь к иконке Discord для CTA «Вступить в Discord».
     */
    public readonly discordIcon = signal('/images/discord.svg');

    /**
     * Адрес документации: стоит за строкой версии, как в боевом подвале.
     */
    public readonly docsUrl = signal('https://docs.lasthearth.ru/');

    /**
     * Версия сайта для строки `footer.version`.
     */
    public readonly siteVersion = signal(environment.siteVersion);

    /**
     * Дата версии для строки `footer.version`.
     */
    public readonly siteVersionDate = signal(environment.siteVersionDate);

    /**
     * Путь к логотипу в `public`.
     */
    public readonly logoSrc = signal('/images/logo.webp');

    /**
     * Строка копирайта: литерал, совпадает с боевым подвалом.
     */
    public readonly copyright = signal('© lasthearth.ru 2025-2026');
}
