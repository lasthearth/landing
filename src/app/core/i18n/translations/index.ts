import { COMMON_I18N } from './features/common.i18n';
import { FOOTER_I18N } from './features/footer.i18n';
import { HEADER_I18N } from './features/header.i18n';
import { MARKET_I18N } from './features/market.i18n';
import { RULES_I18N } from './features/rules.i18n';
import { FAQ_I18N } from './features/faq.i18n';
import { LEGAL_I18N } from './features/legal.i18n';
import { SHARED_I18N } from './features/shared.i18n';
import { HOME_I18N } from './features/home.i18n';
import { NEWS_I18N } from './features/news.i18n';
import { PROFILE_I18N } from './features/profile.i18n';
import { SETTLEMENTS_I18N } from './features/settlements.i18n';
import { ADMIN_I18N } from './features/admin.i18n';
import { REFERRAL_I18N } from './features/referral.i18n';
import { TICKET_I18N } from './features/ticket.i18n';

/**
 * Словари переводов для всех поддерживаемых языков.
 */
export const ALL_TRANSLATIONS = {
    ru: {
        ...COMMON_I18N.ru,
        ...HEADER_I18N.ru,
        ...FOOTER_I18N.ru,
        ...MARKET_I18N.ru,
        ...RULES_I18N.ru,
        ...FAQ_I18N.ru,
        ...LEGAL_I18N.ru,
        ...SHARED_I18N.ru,
        ...HOME_I18N.ru,
        ...NEWS_I18N.ru,
        ...PROFILE_I18N.ru,
        ...SETTLEMENTS_I18N.ru,
        ...ADMIN_I18N.ru,
        ...REFERRAL_I18N.ru,
        ...TICKET_I18N.ru,
    },
    en: {
        ...COMMON_I18N.en,
        ...HEADER_I18N.en,
        ...FOOTER_I18N.en,
        ...MARKET_I18N.en,
        ...RULES_I18N.en,
        ...FAQ_I18N.en,
        ...LEGAL_I18N.en,
        ...SHARED_I18N.en,
        ...HOME_I18N.en,
        ...NEWS_I18N.en,
        ...PROFILE_I18N.en,
        ...SETTLEMENTS_I18N.en,
        ...ADMIN_I18N.en,
        ...REFERRAL_I18N.en,
        ...TICKET_I18N.en,
    },
};
