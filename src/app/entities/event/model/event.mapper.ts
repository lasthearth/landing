import { CalendarEvent, EventDto } from './event.types';

/**
 * Превращает строку даты в `Date` или `null`, если она пустая или некорректная.
 *
 * @param value Дата ISO 8601.
 * @returns Дата или `null`.
 */
function toDate(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Превращает событие из API в модель интерфейса.
 *
 * Событие без даты начала не показать в календаре — для него возвращается `null`.
 *
 * @param dto Событие из API.
 * @returns Событие или `null`.
 */
export function mapEventDto(dto: EventDto): CalendarEvent | null {
    const startsAt = toDate(dto.starts_at);

    if (!dto.id || !startsAt) {
        return null;
    }

    return {
        id: dto.id,
        title: dto.title ?? '',
        description: dto.description ?? '',
        cover: dto.cover ?? '',
        location: dto.location ?? '',
        startsAt,
        endsAt: toDate(dto.ends_at),
        attendeeCount: dto.attendee_count ?? 0,
        attendeePreview: dto.attendee_preview ?? [],
    };
}
