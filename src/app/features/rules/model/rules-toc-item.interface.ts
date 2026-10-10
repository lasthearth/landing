/**
 * Пункт оглавления правил.
 * Связывает раздел (`app-rule-section`) с его заголовком для навигации.
 */
export interface RulesTocItem {
    /**
     * Идентификатор раздела — тот же, что `sectionId` у `app-rule-section`.
     * Блок раздела на странице имеет DOM-id `rules-<sectionId>`.
     */
    sectionId: string;

    /**
     * Ключ перевода заголовка раздела.
     */
    titleKey: string;
}
