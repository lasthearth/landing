import { IColor } from '../model/i-color';

/**
 * Определяет контрастный цвет текста (белый или чёрный)
 * для заданного фона по формуле YIQ.
 *
 * @param color Цвет фона.
 * @returns CSS-цвет текста: `#ffffff` или `#000000`.
 */
export function getContrastColor(color: IColor): string {
    const r = color.red * 255;
    const g = color.green * 255;
    const b = color.blue * 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    return yiq >= 128 ? '#000000' : '#ffffff';
}
