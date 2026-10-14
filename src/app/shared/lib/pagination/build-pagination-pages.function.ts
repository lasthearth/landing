/**
 * Элемент нумерации страниц: номер или разрыв между номерами.
 */
export type PaginationItem = number | 'gap';

/**
 * Сколько страниц показывать целиком, без многоточий.
 */
const SHORT_LIST = 7;

/**
 * Строит нумерацию страниц для пагинации.
 *
 * Короткий список показывается целиком; длинный — первой, последней и окном
 * вокруг текущей: «1 … 4 5 6 … 12». Так ряд не растёт вместе с числом страниц
 * и не ломает вёрстку на телефоне.
 *
 * @param page Текущая страница (с единицы).
 * @param pages Всего страниц.
 * @returns Номера страниц и разрывы между ними.
 */
export function buildPaginationPages(page: number, pages: number): PaginationItem[] {
    const total = Math.max(1, Math.trunc(pages));
    const current = Math.min(Math.max(1, Math.trunc(page)), total);

    if (total <= SHORT_LIST) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    const numbers = [...new Set([1, total, current - 1, current, current + 1])]
        .filter((number) => number >= 1 && number <= total)
        .sort((a, b) => a - b);

    const items: PaginationItem[] = [];

    numbers.forEach((number, index) => {
        const previous = numbers[index - 1];

        if (previous !== undefined && number - previous > 1) {
            items.push('gap');
        }

        items.push(number);
    });

    return items;
}
