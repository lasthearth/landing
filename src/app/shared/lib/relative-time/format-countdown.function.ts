/**
 * Миллисекунд в минуте.
 */
const MINUTE = 60_000;

/**
 * Миллисекунд в часе.
 */
const HOUR = 60 * MINUTE;

/**
 * Миллисекунд в сутках.
 */
const DAY = 24 * HOUR;

/**
 * Форматирует оставшееся время: «2 дня», «5 ч 12 мин», «3 мин».
 *
 * Склонения берёт `Intl.NumberFormat` с единицами измерения, поэтому
 * формат одинаково корректен для русского и английского.
 *
 * @param msLeft Сколько миллисекунд осталось.
 * @param locale Локаль (`ru`, `en`).
 * @returns Подпись или пустая строка, если время вышло.
 */
export function formatCountdown(msLeft: number, locale: string): string {
    if (msLeft <= 0) {
        return '';
    }

    const unit = (value: number, name: 'day' | 'hour' | 'minute', display: 'long' | 'short'): string =>
        new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: display }).format(value);

    if (msLeft >= DAY) {
        return unit(Math.floor(msLeft / DAY), 'day', 'long');
    }

    const hours = Math.floor(msLeft / HOUR);
    const minutes = Math.max(1, Math.ceil((msLeft % HOUR) / MINUTE));

    if (hours === 0) {
        // 59 мин 40 с округляются вверх до «60 мин» — это уже час.
        return minutes === 60 ? unit(1, 'hour', 'short') : unit(minutes, 'minute', 'short');
    }

    return minutes === 60
        ? unit(hours + 1, 'hour', 'short')
        : `${unit(hours, 'hour', 'short')} ${unit(minutes, 'minute', 'short')}`;
}
