import { CalendarEvent } from '@entities/event';

/**
 * Длительность события без указанного окончания, мс: столько оно считается идущим.
 */
export const DEFAULT_EVENT_DURATION = 2 * 60 * 60 * 1000;

/**
 * Состояние события относительно текущего момента.
 */
export type EventStatus = 'upcoming' | 'live' | 'ended';

/**
 * Определяет, предстоит ли событие, идёт или завершилось.
 *
 * Событие без окончания считается идущим {@link DEFAULT_EVENT_DURATION} после начала.
 *
 * @param event Событие.
 * @param now Текущий момент, мс.
 * @returns Состояние.
 */
export function eventStatus(event: CalendarEvent, now: number): EventStatus {
    const start = event.startsAt.getTime();
    const end = event.endsAt?.getTime() ?? start + DEFAULT_EVENT_DURATION;

    if (now < start) {
        return 'upcoming';
    }

    return now < end ? 'live' : 'ended';
}
