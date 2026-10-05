import { NEWS_BANNER_MARKER_PATTERN } from './news-banner-marker.constant';

/**
 * Убирает скрытую метку баннера из HTML новости.
 *
 * @param content HTML новости.
 * @returns HTML без метки.
 */
export function stripNewsBanner(content: string): string {
    return content.replace(NEWS_BANNER_MARKER_PATTERN, '').trimEnd();
}
