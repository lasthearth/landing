import { IColor } from '../model/i-color';

/**
 * Преобразует модель цвета в CSS-строку rgba().
 *
 * @param color Цвет в формате [0, 1].
 * @returns CSS-строка вида `rgba(r, g, b, a)`.
 */
export function colorToCss(color: IColor): string {
    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    const a = color.alpha ?? 1;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
