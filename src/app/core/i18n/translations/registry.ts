import { Language, Translations } from '../i18n.types';

/**
 * Словари одного домена: русский и английский.
 */
export type TranslationBundle = Record<Language, Translations>;

/**
 * Загруженные переводы, склеенные по языкам.
 *
 * Раньше все словари собирались в один статический объект, и правила
 * сервера (224 kB текста) вместе с юридическими страницами (64 kB)
 * попадали в начальный бандл, хотя первый экран их не показывает.
 * Теперь домены страниц подмешиваются сюда при загрузке роута.
 */
export const TRANSLATIONS: TranslationBundle = {
    ru: {},
    en: {},
};

/**
 * Подмешивает словарь домена в общий реестр.
 *
 * Слияние поверхностное: у каждого домена свой корневой ключ
 * (`rules`, `market`, ...), поэтому пересечений нет.
 *
 * @param bundle Словари домена по языкам.
 */
export function registerTranslations(bundle: TranslationBundle): void {
    Object.assign(TRANSLATIONS.ru, bundle.ru);
    Object.assign(TRANSLATIONS.en, bundle.en);
}
