/**
 * Через сколько дней по умолчанию истекает баннер.
 */
const DEFAULT_BANNER_DAYS = 3;

/**
 * Значение по умолчанию для поля «Показывать до»: через три дня, с точностью до часа.
 *
 * @returns Строка для `<input type="datetime-local">` в локальном времени.
 */
export function bannerUntilDefault(): string {
    const date = new Date(Date.now() + DEFAULT_BANNER_DAYS * 24 * 60 * 60 * 1000);
    date.setMinutes(0, 0, 0);

    return toDateTimeLocal(date);
}

/**
 * Переводит дату в формат `YYYY-MM-DDTHH:mm` в локальном времени.
 *
 * @param date Дата.
 */
export function toDateTimeLocal(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}
