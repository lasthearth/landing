import { CalendarEvent } from '../model/event.types';

/**
 * Длительность события без указанного окончания, мс (для календаря).
 */
const DEFAULT_DURATION = 2 * 60 * 60 * 1000;

/**
 * Форматирует дату для iCalendar: `20261010T180000Z`.
 *
 * @param date Дата.
 * @returns Дата в UTC без разделителей.
 */
function icsDate(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
}

/**
 * Экранирует текст по правилам iCalendar (RFC 5545, 3.3.11).
 *
 * @param text Текст.
 * @returns Экранированный текст.
 */
function icsText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * Переносит длинную строку iCalendar: не длиннее 75 октетов, продолжение начинается с пробела.
 *
 * @param line Строка «ИМЯ:значение».
 * @returns Строка с переносами.
 */
function foldLine(line: string): string {
    const encoder = new TextEncoder();
    const parts: string[] = [];
    let current = '';

    for (const char of line) {
        const limit = parts.length === 0 ? 75 : 74;

        if (encoder.encode(current + char).length > limit) {
            parts.push(current);
            current = char;
        } else {
            current += char;
        }
    }

    parts.push(current);
    return parts.join('\r\n ');
}

/**
 * Убирает разметку редактора из описания: календарям нужен простой текст.
 *
 * @param source Описание в разметке.
 * @returns Простой текст.
 */
function plainText(source: string): string {
    return source
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/^>\s?/gm, '')
        .replace(/(\*\*|__|~~|\|\||`)/g, '')
        .trim();
}

/**
 * Собирает файл iCalendar (.ics) с одним событием.
 *
 * @param event Событие.
 * @param url Ссылка на страницу события.
 * @param now Время формирования файла.
 * @returns Содержимое файла.
 */
export function buildEventIcs(event: CalendarEvent, url: string, now = new Date()): string {
    const end = event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_DURATION);
    const description = [plainText(event.description), url].filter(Boolean).join('\n\n');

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Last Hearth//Events//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${event.id}@lasthearth.ru`,
        `DTSTAMP:${icsDate(now)}`,
        `DTSTART:${icsDate(event.startsAt)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsText(event.title)}`,
        `DESCRIPTION:${icsText(description)}`,
        ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
        `URL:${url}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return lines.map(foldLine).join('\r\n') + '\r\n';
}
