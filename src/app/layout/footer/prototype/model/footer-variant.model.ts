/**
 * Идентификатор варианта прототипа подвала.
 *
 * Совпадает со значением параметра адреса `?fvariant=`.
 */
export type FooterVariantId = 'ember-field' | 'hearth-gate' | 'night-skyline';

/**
 * Опция переключателя вариантов прототипа.
 */
export interface FooterVariantOption {
    /** Идентификатор варианта для параметра `?fvariant=`. */
    readonly id: FooterVariantId;

    /** Подпись варианта в пилюле-переключателе: литерал прототипа. */
    readonly title: string;
}
