import { registerTranslations } from './registry';
import { COMMON_I18N } from './features/common.i18n';
import { FOOTER_I18N } from './features/footer.i18n';
import { HEADER_I18N } from './features/header.i18n';
import { NEWS_I18N } from './features/news.i18n';
import { SHARED_I18N } from './features/shared.i18n';
import { TICKET_I18N } from './features/ticket.i18n';

export { TRANSLATIONS, registerTranslations } from './registry';
export type { TranslationBundle } from './registry';

/**
 * Словари, нужные на любой странице: общие подписи, шапка, подвал,
 * shared-компоненты (включая приветственный экран и 404), тикет и новости.
 *
 * Всё остальное грузится вместе со своей страницей — см. `app.routes.ts`.
 */
registerTranslations(COMMON_I18N);
registerTranslations(HEADER_I18N);
registerTranslations(FOOTER_I18N);
registerTranslations(SHARED_I18N);
registerTranslations(TICKET_I18N);
registerTranslations(NEWS_I18N);
