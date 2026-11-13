/**
 * Идентификатор варианта прототипа шапки.
 *
 * Совпадает со значением параметра адреса `?hvariant=`.
 */
export type HeaderVariantId = 'hearth-gate' | 'rail' | 'hud' | 'crown' | 'deck' | 'morph' | 'hearth-crown';

/**
 * Опция переключателя вариантов прототипа.
 */
export interface HeaderVariantOption {
    /** Идентификатор варианта для параметра `?hvariant=`. */
    readonly id: HeaderVariantId;

    /** Подпись варианта в пилюле-переключателе: литерал прототипа. */
    readonly title: string;
}
