/**
 * Считает длину описания «О себе» так же, как сервер.
 *
 * Символы считаются в рунах (`Array.from`), а не в UTF-16-единицах:
 * эмодзи и редкие иероглифы занимают две единицы, но один символ,
 * и сервер считает именно символы. Строки — по переводам строки,
 * включая `\r\n` из Windows.
 *
 * @param text Текст описания.
 * @returns Число символов и число строк.
 */
export function aboutLength(text: string): { symbols: number; lines: number } {
    const lines = text ? text.replace(/\r\n?/g, '\n').split('\n').length : 0;

    return { symbols: Array.from(text).length, lines };
}
