import { IColor } from '../model/i-color';

/**
 * Преобразует HEX-цвет в модель google.type.Color.
 *
 * @param hex Строка вида `#rrggbb` или `#rgb`.
 * @returns Цвет с каналами в диапазоне [0, 1].
 */
export function hexToColor(hex: string): IColor {
    const normalized = hex.replace('#', '');

    const expanded =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((char) => char + char)
                  .join('')
            : normalized;

    const red = parseInt(expanded.substring(0, 2), 16) / 255;
    const green = parseInt(expanded.substring(2, 4), 16) / 255;
    const blue = parseInt(expanded.substring(4, 6), 16) / 255;

    return { red, green, blue };
}
