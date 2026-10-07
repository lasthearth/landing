import { buildEventIcs, CalendarEvent } from '@entities/event';

/**
 * Скачивает событие файлом `.ics` — его открывают Google, Apple и Outlook календари.
 *
 * @param event Событие.
 * @param origin Адрес сайта (для ссылки на событие).
 */
export function downloadEventIcs(event: CalendarEvent, origin: string): void {
    const ics = buildEventIcs(event, `${origin}/events#event-${event.id}`);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');

    link.href = url;
    link.download = `lasthearth-${event.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
