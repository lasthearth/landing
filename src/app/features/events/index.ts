/**
 * Публичный API фичи «Календарь событий».
 *
 * Страница календаря подключается роутом напрямую (ленивая загрузка),
 * поэтому здесь только блок для главной, «Мои события» для профиля и записи игрока.
 */
export { UpcomingEventComponent } from './ui/upcoming-event/upcoming-event.component';
export { MyEventsComponent } from './ui/my-events/my-events.component';
export { EventAttendanceService } from './api/event-attendance.service';
