/**
 * Размер файла для подписи: число и единица.
 *
 * Единицу переводит потребитель (`mods.units.kb` / `mods.units.mb`), число
 * уже округлено: до целых килобайт и до десятых мегабайта.
 */
export interface FileSize {
    value: number;
    unit: 'kb' | 'mb';
}

/**
 * Раскладывает размер в байтах на число и единицу.
 *
 * @param bytes Размер в байтах.
 * @returns Размер или `null`, если он неизвестен.
 */
export function fileSize(bytes: number): FileSize | null {
    if (!bytes || bytes <= 0) {
        return null;
    }

    const kb = bytes / 1024;

    if (kb < 1000) {
        return { value: Math.max(1, Math.round(kb)), unit: 'kb' };
    }

    return { value: Math.round((kb / 1024) * 10) / 10, unit: 'mb' };
}
