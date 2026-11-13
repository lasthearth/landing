import { HeaderVariantOption } from '../model/header-variant.model';

/**
 * Варианты прототипа шапки в порядке переключения.
 *
 * Подписи — литералы прототипа: в словарь они не попадают, потому что
 * переключатель существует только в сборке разработки.
 */
export const HEADER_PROTOTYPE_VARIANTS: readonly HeaderVariantOption[] = [
    { id: 'hearth-gate', title: 'Врата очага' },
    { id: 'rail', title: 'Угольный рельс' },
    { id: 'hud', title: 'Военный стол' },
    { id: 'crown', title: 'Корона' },
    { id: 'deck', title: 'Две палубы' },
    { id: 'morph', title: 'Живая капсула' },
    { id: 'hearth-crown', title: 'Очаг и корона' },
];
