import { ContentSection } from '../model/content-section';

/**
 * Определяет, какой раздел открыт по адресу страницы.
 *
 * Новости живут на главной и на страницах `/news/:id`.
 *
 * @param url Адрес из роутера (`/diplomacy`, `/news/123?x=1`).
 * @returns Раздел или `null`, если страница к разделам не относится.
 */
export function sectionByUrl(url: string): ContentSection | null {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/home' || path.startsWith('/news')) {
        return 'news';
    }

    if (path === '/diplomacy') {
        return 'diplomacy';
    }

    if (path === '/gallery') {
        return 'gallery';
    }

    return null;
}
