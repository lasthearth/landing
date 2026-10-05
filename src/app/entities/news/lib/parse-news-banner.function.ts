import { NewsBanner } from '../model/news-banner';
import { NEWS_BANNER_MARKER_PATTERN } from './news-banner-marker.constant';

/**
 * Достаёт настройки баннера из HTML новости.
 *
 * @param content HTML новости.
 * @returns Настройки баннера или `null`, если метки нет или она повреждена.
 */
export function parseNewsBanner(content: string | null | undefined): NewsBanner | null {
    const match = content ? NEWS_BANNER_MARKER_PATTERN.exec(content) : null;

    if (!match) {
        return null;
    }

    try {
        const raw = JSON.parse(match[1]) as Partial<NewsBanner>;
        const until = typeof raw.until === 'string' ? raw.until : '';

        if (!until || Number.isNaN(Date.parse(until))) {
            return null;
        }

        return { until, countdown: raw.countdown === true };
    } catch {
        return null;
    }
}
