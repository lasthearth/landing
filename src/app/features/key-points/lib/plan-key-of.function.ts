import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Ключ плана схемы в планировщике: у отдельной точки свой, иначе — тип точки.
 *
 * @param scheme Схема.
 * @returns Ключ плана.
 */
export function planKeyOf(scheme: KeyPointScheme): string {
    return scheme.planKey ?? scheme.id;
}
