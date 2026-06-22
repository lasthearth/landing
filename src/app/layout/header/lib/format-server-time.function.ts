/**
 * Русские названия месяцев в родительном падеже.
 */
const MONTH_NAMES_RU: Record<string, string> = {
    january: 'января',
    february: 'февраля',
    march: 'марта',
    april: 'апреля',
    may: 'мая',
    june: 'июня',
    july: 'июля',
    august: 'августа',
    september: 'сентября',
    october: 'октября',
    november: 'ноября',
    december: 'декабря',
};

/**
 * Форматирует игровое время сервера с учётом текущего языка интерфейса.
 *
 * Бэкенд отдаёт строку вида "25. July, Year 2, 13:44",
 * которую невозможно распарсить стандартными средствами JavaScript.
 * Функция извлекает компоненты вручную и локализует месяц и слово "Year".
 *
 * @param rawTime Строка времени, полученная от бэкенда.
 * @param language Текущий язык интерфейса.
 * @returns Локализованная строка времени.
 */
export function formatServerTime(rawTime: string, language: string): string {
    const match = rawTime.match(/^(\d+)\.\s*([A-Za-z]+),\s*Year\s+(\d+),\s*(.+)$/);

    if (!match) {
        return rawTime;
    }

    const [, day, monthEn, year, time] = match;

    if (language === 'ru') {
        const monthRu = MONTH_NAMES_RU[monthEn.toLowerCase()] ?? monthEn;

        return `${day} ${monthRu}, ${year} год, ${time}`;
    }

    return rawTime;
}
