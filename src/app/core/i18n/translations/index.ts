import { registerTranslations } from './registry';
import { ANALYTICS_I18N } from './features/analytics.i18n';
import { COMMON_I18N } from './features/common.i18n';
import { FOOTER_I18N } from './features/footer.i18n';
import { HEADER_I18N } from './features/header.i18n';
import { NEWS_I18N } from './features/news.i18n';
import { PAGINATION_I18N } from './features/pagination.i18n';
import { SHARED_I18N } from './features/shared.i18n';

export { TRANSLATIONS, registerTranslations } from './registry';
export type { TranslationBundle } from './registry';

/**
 * Словари, нужные на любой странице: общие подписи, шапка, подвал,
 * shared-компоненты (включая приветственный экран и 404), новости
 * и плашка согласия на аналитические cookies.
 *
 * Всё остальное грузится вместе со своей страницей — см. `app.routes.ts`.
 */
registerTranslations(ANALYTICS_I18N);
registerTranslations(COMMON_I18N);
registerTranslations(HEADER_I18N);
registerTranslations(FOOTER_I18N);
registerTranslations(SHARED_I18N);
registerTranslations(NEWS_I18N);
registerTranslations(PAGINATION_I18N);
