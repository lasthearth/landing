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

    /** Признак знака с полями внутри viewBox: коробка иконки на 4px больше, чтобы оптика ряда была ровной. */
    readonly isPaddedGlyph?: boolean;
}
