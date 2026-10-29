import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Префикс ключей словаря для текстов узлов схемы.
 *
 * @param scheme Схема.
 * @returns Префикс вида `keyPoints.points.mine.variants.north`.
 */
export function textKeyOf(scheme: KeyPointScheme): string {
    return scheme.textKey ?? `keyPoints.points.${scheme.id}`;
}
