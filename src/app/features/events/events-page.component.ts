import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { CalendarEvent, EventApiService } from '@entities/event';
import { IPlayer, UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, filter, of, switchMap } from 'rxjs';
import { EventAttendanceService } from './api/event-attendance.service';
import { downloadEventIcs } from './lib/download-event-ics.function';
import { EventsTab } from './model/events-tab';
import { EventCardComponent } from './ui/event-card/event-card.component';
import { EventFormComponent } from './ui/event-form/event-form.component';
import { PageHeaderComponent } from '@shared/ui/page-header';

/**
 * Календарь событий сервера: предстоящие и прошедшие.
 *
 * Администратор добавляет, изменяет и удаляет события прямо здесь.
 * Ссылка `/events#event-<id>` открывает нужную вкладку, прокручивает к событию и подсвечивает его.
 */
@Component({
    selector: 'app-events-page',
    templateUrl: './events-page.component.html',
    styleUrl: './events-page.component.less',
    imports: [PageHeaderComponent, TuiIcon, TranslatePipe, EventCardComponent, EventFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsPageComponent {
    private readonly api = inject(EventApiService);
    protected readonly attendance = inject(EventAttendanceService);
    private readonly userService = inject(UserService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly status = inject(RequestStatusService);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Открытая вкладка.
     */
    protected readonly tab = signal<EventsTab>('upcoming');

    /**
     * События вкладок (`null` — ещё не загружены).
     */
    private readonly lists = signal<Record<EventsTab, CalendarEvent[] | null>>({ upcoming: null, past: null });

    /**
     * События открытой вкладки.
     */
    protected readonly events = computed(() => this.lists()[this.tab()]);

    /**
     * Ошибка загрузки открытой вкладки.
     */
    protected readonly error = signal(false);

    /**
     * Форма: `'new'` — создание, событие — изменение, `null` — закрыта.
     */
    protected readonly editing = signal<CalendarEvent | 'new' | null>(null);

    /**
     * Событие из ссылки, которое нужно подсветить.
     */
    protected readonly targetId = signal<string | null>(null);

    /**
     * Вошёл ли пользователь (роли появляются после входа).
     */
    protected readonly authed = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Событие, по которому идёт запрос записи.
     */
    protected readonly busyId = signal<string | null>(null);

    /**
     * Игроки по идентификатору (аватары записавшихся).
     */
    protected readonly players = signal<Record<string, IPlayer>>({});

    /**
     * Может ли пользователь управлять событиями.
     */
    protected readonly canManage = computed(() => this.authed() && this.userService.roles.includes('admin'));

    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        const fragment = this.route.snapshot.fragment;
        this.targetId.set(fragment?.startsWith('event-') ? fragment.slice('event-'.length) : null);

        this.load('upcoming');
    }

    /**
     * Переключает вкладку и при первом открытии загружает её.
     *
     * @param tab Вкладка.
     */
    protected selectTab(tab: EventsTab): void {
        this.tab.set(tab);
        this.error.set(false);

        if (this.lists()[tab] === null) {
            this.load(tab);
        }
    }

    /**
     * Открывает форму нового события.
     */
    protected create(): void {
        this.editing.set('new');
    }

    /**
     * Открывает форму изменения события.
     *
     * @param event Событие.
     */
    protected edit(event: CalendarEvent): void {
        this.editing.set(event);
        this.scrollTo('events-form');
    }

    /**
     * Обрабатывает сохранение: закрывает форму и перезагружает списки.
     *
     * @param event Сохранённое событие.
     */
    protected onSaved(event: CalendarEvent): void {
        this.editing.set(null);
        this.targetId.set(event.id);
        this.lists.set({ upcoming: null, past: null });
        this.load(this.tab());
    }

    /**
     * Удаляет событие после подтверждения.
     *
     * @param event Событие.
     */
    protected remove(event: CalendarEvent): void {
        this.confirm
            .open({
                title: this.i18n.translate('events.admin.deleteTitle'),
                text: this.i18n.translate('events.admin.deleteText', { title: event.title }),
            })
            .pipe(
                filter(Boolean),
                switchMap(() => this.api.delete(event.id)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.status.showSuccess(this.i18n.translate('events.admin.deleted'));
                    this.lists.update((lists) => ({
                        upcoming: lists.upcoming?.filter((item) => item.id !== event.id) ?? null,
                        past: lists.past?.filter((item) => item.id !== event.id) ?? null,
                    }));
                },
                error: () => undefined,
            });
    }

    /**
     * Записывает на событие или отменяет запись.
     *
     * @param event Событие.
     */
    protected toggleAttendance(event: CalendarEvent): void {
        const attending = !this.attendance.isAttending(event.id);
        this.busyId.set(event.id);
        this.attendance
            .set(event, attending)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.busyId.set(null);
                    this.patch(event.id, { attendeeCount: result.count, attendeePreview: result.preview });
                    this.loadPlayers(result.preview);
                    this.status.showSuccess(
                        this.i18n.translate(result.attending ? 'events.going.toastOn' : 'events.going.toastOff')
                    );
                },
                error: () => {
                    this.busyId.set(null);
                    this.status.showError(this.i18n.translate('events.going.toastError'));
                },
            });
    }

    /**
     * Вход для гостя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }

    /**
     * Скачивает событие файлом `.ics`.
     *
     * @param event Событие.
     */
    protected download(event: CalendarEvent): void {
        downloadEventIcs(event, window.location.origin);
    }

    /**
     * Загружает вкладку.
     *
     * Если событие из ссылки не нашлось среди предстоящих — ищет его в прошедших.
     *
     * @param tab Вкладка.
     */
    private load(tab: EventsTab): void {
        this.api
            .list(tab === 'past')
            .pipe(
                catchError(() => {
                    if (this.tab() === tab) {
                        this.error.set(true);
                    }
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((events) => {
                if (!events) {
                    return;
                }

                this.lists.update((lists) => ({ ...lists, [tab]: events }));
                this.loadPlayers(events.flatMap((event) => event.attendeePreview));

                const target = this.targetId();

                if (!target) {
                    return;
                }

                if (events.some((event) => event.id === target)) {
                    if (this.tab() === tab) {
                        this.scrollTo(`event-${target}`);
                    }
                } else if (tab === 'upcoming' && this.tab() === 'upcoming') {
                    this.selectTab('past');
                }
            });
    }

    /**
     * Меняет поля события в обоих списках.
     *
     * @param id Событие.
     * @param changes Новые значения.
     */
    private patch(id: string, changes: Partial<CalendarEvent>): void {
        const apply = (list: CalendarEvent[] | null): CalendarEvent[] | null =>
            list?.map((item) => (item.id === id ? { ...item, ...changes } : item)) ?? null;
        this.lists.update((lists) => ({ upcoming: apply(lists.upcoming), past: apply(lists.past) }));
    }

    /**
     * Догружает ники и аватары игроков, которых ещё нет.
     *
     * @param ids Идентификаторы.
     */
    private loadPlayers(ids: string[]): void {
        const known = this.players();
        const missing = [...new Set(ids)].filter((id) => !known[id]);
        if (!missing.length) {
            return;
        }

        this.userService
            .getPlayersBatch$(missing)
            .pipe(
                catchError(() => of([] as IPlayer[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) =>
                this.players.update((current) => ({
                    ...current,
                    ...Object.fromEntries(players.filter(Boolean).map((player) => [player.user_id, player])),
                }))
            );
    }

    /**
     * Прокручивает к элементу после отрисовки.
     *
     * @param id Идентификатор элемента.
     */
    private scrollTo(id: string): void {
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
}
