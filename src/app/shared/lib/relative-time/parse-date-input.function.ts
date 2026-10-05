/**
 * Граница между unix-временем в секундах и в миллисекундах.
 *
 * 1e11 секунд — это 5138 год, а 1e11 миллисекунд — 1973 год:
 * всё, что меньше, считаем секундами.
 */
const SECONDS_LIMIT = 1e11;

/**
 * Приводит дату из API к `Date`.
 *
 * Понимает `Date`, ISO-строку, число и строку из цифр — unix-время в секундах
 * или миллисекундах (так приходят int64-поля protobuf, например `created_at` поселений).
 *
 * @param value Значение из API.
 * @returns Дата или `null`, если значение пустое или некорректное.
 */
export function parseDateInput(value: Date | string | number | null | undefined): Date | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const numeric = typeof value === 'number' ? value : /^\d+$/.test(value) ? Number(value) : null;
    const date =
        numeric === null ? new Date(value) : new Date(numeric < SECONDS_LIMIT ? numeric * 1000 : numeric);

    // protobuf-ноль «0001-01-01T00:00:00Z» и нулевой unix-штамп — это «даты нет».
    return Number.isNaN(date.getTime()) || date.getTime() <= 0 ? null : date;
}
