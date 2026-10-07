/**
 * Форматирует дату для `<input type="datetime-local">` в часовом поясе браузера.
 *
 * @param date Дата.
 * @returns Строка вида `2026-10-10T18:00`.
 */
export function toLocalInputValue(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}
