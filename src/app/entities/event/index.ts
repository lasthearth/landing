/**
 * Публичный API сущности «Событие».
 */
export type { CalendarEvent, EventDto, SaveEventRequest } from './model/event.types';
export { mapEventDto } from './model/event.mapper';
export { EventApiService } from './api/event.api';
export { buildEventIcs } from './lib/build-event-ics.function';
