/**
 * Кэш форматтеров по локали.
 *
 * `Intl.DateTimeFormat` стоит заметно дороже, чем одно форматирование,
 * а списки вроде стены галереи подписывают сотни дат за один пересчёт.
 */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * Возвращает форматтер короткой даты для локали, создавая его один раз.
 *
 * @param locale Локаль: `ru` или `en`.
 * @returns Форматтер «3 ноября 2026».
 */
function formatterFor(locale: string): Intl.DateTimeFormat {
    let formatter = FORMATTERS.get(locale);

    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        FORMATTERS.set(locale, formatter);
    }

    return formatter;
}

/**
 * Форматирует дату без времени: «3 ноября 2026», «November 3, 2026».
 *
 * Отличается от {@link formatFullDate} отсутствием времени: там «3 ноября
 * 2026 г. в 14:20», здесь только день. Нужно спискам, где время показывают
 * отдельно и в относительном виде («два часа назад»).
 *
 * @param value Дата: объект, ISO-строка или миллисекунды.
 * @param locale Локаль: `ru` или `en`.
 * @returns Отформатированная дата или пустая строка, если дата не читается.
 */
export function formatShortDate(value: Date | string | number | null | undefined, locale: string): string {
    const date = value instanceof Date ? value : value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }

    return formatterFor(locale).format(date);
}
