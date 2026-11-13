import { FooterVariantOption } from '../model/footer-variant.model';

/**
 * Варианты прототипа подвала в порядке переключения.
 *
 * Подписи — литералы прототипа: в словарь они не попадают, потому что
 * переключатель существует только в сборке разработки.
 */
export const FOOTER_PROTOTYPE_VARIANTS: readonly FooterVariantOption[] = [
    { id: 'ember-field', title: 'Угольки' },
    { id: 'hearth-gate', title: 'Врата очага' },
    { id: 'night-skyline', title: 'Ночной силуэт' },
];
