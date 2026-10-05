import { RelativeTimeLabels } from './relative-time-labels';

/**
 * Количество миллисекунд в минуте.
 */
const MINUTE_MS = 60_000;

/**
 * Количество миллисекунд в часе.
 */
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Форматирует дату относительно текущего момента.
 *
 * Шкала:
 * - меньше минуты — «только что»;
 * - меньше часа — «минуту назад», «5 минут назад»;
 * - меньше суток — «час назад», «3 часа назад»;
 * - 1–6 календарных дней — «вчера», «позавчера», «4 дня назад»;
 * - 7–13 дней — «неделю назад»;
 * - дальше — дата: «12 сентября», для прошлых лет «12 сентября 2025 г.».
 *
 * Даты из будущего (расхождение часов клиента и сервера) считаются «только что».
 *
 * @param date Момент публикации.
 * @param now Текущий момент в миллисекундах.
 * @param locale Локаль: `ru` или `en`.
 * @param labels Подписи, которых нет в Intl.
 * @returns Строка для отображения.
 */
export function formatRelativeTime(date: Date, now: number, locale: string, labels: RelativeTimeLabels): string {
    const diff = now - date.getTime();

    if (diff < MINUTE_MS) {
        return labels.justNow;
    }

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diff < HOUR_MS) {
        const minutes = Math.floor(diff / MINUTE_MS);
        return minutes === 1 ? labels.minuteAgo : rtf.format(-minutes, 'minute');
    }

    if (diff < 24 * HOUR_MS) {
        const hours = Math.floor(diff / HOUR_MS);
        return hours === 1 ? labels.hourAgo : rtf.format(-hours, 'hour');
    }

    const nowDate = new Date(now);
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    // Округление гасит сдвиг на час при переходе на летнее/зимнее время.
    const days = Math.max(1, Math.round((startOfToday - startOfDate) / (24 * HOUR_MS)));

    if (days < 7) {
        return rtf.format(-days, 'day');
    }

    if (days < 14) {
        return labels.weekAgo;
    }

    const sameYear = date.getFullYear() === nowDate.getFullYear();

    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date);
}
