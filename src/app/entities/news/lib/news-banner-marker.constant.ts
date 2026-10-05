/**
 * Начало скрытой метки баннера в HTML новости.
 *
 * Метка — HTML-комментарий: браузер его не показывает, санитайзер Angular вырезает при выводе.
 */
export const NEWS_BANNER_MARKER_START = '<!--lh-banner:';

/**
 * Скрытая метка баннера целиком: `<!--lh-banner:{"until":"…","countdown":true}-->`.
 */
export const NEWS_BANNER_MARKER_PATTERN = /<!--lh-banner:(\{[^>]*?\})-->/;
