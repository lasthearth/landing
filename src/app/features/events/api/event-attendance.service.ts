import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CalendarEvent, EventApiService, EventAttendance } from '@entities/event';
import { UserService } from '@entities/user';
import { catchError, distinctUntilChanged, Observable, of, switchMap, tap } from 'rxjs';

/**
 * Записи игрока на события: на какие предстоящие события он идёт.
 *
 * Общий для календаря, главной и профиля: запись на одной странице сразу видна
 * на остальных. Загружается после входа и сбрасывается при выходе.
 */
@Injectable({ providedIn: 'root' })
export class EventAttendanceService {
    private readonly api = inject(EventApiService);
    private readonly userService = inject(UserService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Предстоящие события игрока (`null` — не загружены или гость).
     */
    public readonly mine = signal<CalendarEvent[] | null>(null);

    /**
     * Идентификаторы событий, на которые игрок записан.
     */
    public readonly ids = computed(() => new Set((this.mine() ?? []).map((event) => event.id)));

    public constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }

        this.userService.authState$
            .pipe(
                distinctUntilChanged(),
                switchMap((authed) => (authed ? this.api.mine().pipe(catchError(() => of(null))) : of(null))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((events) => this.mine.set(events));
    }

    /**
     * Записан ли игрок на событие.
     *
     * @param id Событие.
     * @returns Признак записи.
     */
    public isAttending(id: string): boolean {
        return this.ids().has(id);
    }

    /**
     * Записывает на событие или отменяет запись и обновляет «Мои события».
     *
     * @param event Событие.
     * @param attending Записаться или отказаться.
     * @returns Observable с итогом.
     */
    public set(event: CalendarEvent, attending: boolean): Observable<EventAttendance> {
        return this.api.setAttendance(event.id, attending).pipe(
            tap((result) => {
                const updated: CalendarEvent = {
                    ...event,
                    attendeeCount: result.count,
                    attendeePreview: result.preview,
                };
                this.mine.update((list) => {
                    const rest = (list ?? []).filter((item) => item.id !== event.id);
                    if (!result.attending) {
                        return rest;
                    }
                    return [...rest, updated].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
                });
            })
        );
    }
}
