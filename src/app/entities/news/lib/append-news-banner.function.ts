import { NewsBanner } from '../model/news-banner';
import { NEWS_BANNER_MARKER_START } from './news-banner-marker.constant';
import { stripNewsBanner } from './strip-news-banner.function';

/**
 * Добавляет в конец HTML новости скрытую метку баннера.
 *
 * @param content HTML новости.
 * @param banner Настройки баннера.
 * @returns HTML с меткой.
 */
export function appendNewsBanner(content: string, banner: NewsBanner): string {
    const payload = JSON.stringify({ until: banner.until, countdown: banner.countdown });
    return `${stripNewsBanner(content)}${NEWS_BANNER_MARKER_START}${payload}-->`;
}
