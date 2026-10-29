import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Подставляет в схему типа выбранную отдельную точку.
 *
 * @param scheme Схема типа точки.
 * @param variantKey Ключ отдельной точки (из адреса); неизвестный — первая точка.
 * @returns Схема для показа: узлы, размер, ключи словаря и плана отдельной точки.
 *   Тип без отдельных точек возвращается как есть.
 */
export function resolveVariant(scheme: KeyPointScheme, variantKey: string | null): KeyPointScheme {
    const variants = scheme.variants;
    if (!variants?.length) {
        return scheme;
    }

    const variant = variants.find((item) => item.key === variantKey) ?? variants[0];

    return {
        ...scheme,
        lanes: variant.lanes,
        tiers: variant.tiers,
        nodes: variant.nodes,
        textKey: `keyPoints.points.${scheme.id}.variants.${variant.key}`,
        planKey: `${scheme.id}:${variant.key}`,
    };
}
