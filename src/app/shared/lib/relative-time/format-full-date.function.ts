/**
 * Форматирует полную дату и время: «5 октября 2026 г. в 14:20».
 *
 * Используется в подсказке к относительному времени и при серверном
 * рендере, где относительное время зафиксировалось бы на момент сборки.
 *
 * @param date Дата.
 * @param locale Локаль: `ru` или `en`.
 * @returns Отформатированная строка.
 */
export function formatFullDate(date: Date, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
