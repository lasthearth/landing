/**
 * Ссылка на внешний канал проекта в подвале прототипа.
 */
export interface FooterSocialLink {
    /** Адрес канала. */
    readonly url: string;

    /** Путь к иконке в `public`. */
    readonly icon: string;

    /** Ключ словаря с подписью канала. */
    readonly labelKey: string;

    /** Признак иконки, которую боевой подвал рисует уменьшенной (`size-6`), а не во всю плитку. */
    readonly isSmallIcon?: boolean;
}
