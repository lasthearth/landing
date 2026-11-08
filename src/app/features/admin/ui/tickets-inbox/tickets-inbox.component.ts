import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    input,
    PLATFORM_ID,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    AdminTicketCounters,
    AdminTicketPatch,
    AdminTicketQuery,
    SavedReply,
    Ticket,
    TICKET_CATEGORIES,
    TICKET_LIMITS,
    TicketApiService,
    TicketCategory,
    TicketStatusComponent,
    TicketThreadComponent,
} from '@entities/ticket';
import { UserService } from '@entities/user';
import { TicketPeopleService } from '@features/support';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { AdminListSkeletonComponent } from '@shared/ui/skeletons';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, filter, fromEvent, map, Observable, of, startWith, switchMap, timer } from 'rxjs';

/**
 * Как часто обновлять входящие и открытое обращение, пока вкладка видна (мс).
 */
const REFRESH_MS = 20_000;

/**
 * Отбор входящих: вкладки над списком.
 */
type InboxFilter = 'open' | 'mine' | 'nobody' | 'answered' | 'closed' | 'all';

/**
 * Вкладки отбора в порядке показа.
 */
const INBOX_FILTERS: readonly InboxFilter[] = ['open', 'mine', 'nobody', 'answered', 'closed', 'all'];

/**
 * Запрос к API под каждую вкладку.
 */
const FILTER_QUERY: Record<InboxFilter, Omit<AdminTicketQuery, 'category' | 'pageToken'>> = {
    open: { status: 'TICKET_STATUS_OPEN', assignee: 'ASSIGNEE_FILTER_UNSPECIFIED' },
    mine: { status: 'TICKET_STATUS_OPEN', assignee: 'ASSIGNEE_FILTER_MINE' },
    nobody: { status: 'TICKET_STATUS_OPEN', assignee: 'ASSIGNEE_FILTER_NOBODY' },
    answered: { status: 'TICKET_STATUS_ANSWERED', assignee: 'ASSIGNEE_FILTER_UNSPECIFIED' },
    closed: { status: 'TICKET_STATUS_CLOSED', assignee: 'ASSIGNEE_FILTER_UNSPECIFIED' },
    all: { status: null, assignee: 'ASSIGNEE_FILTER_UNSPECIFIED' },
};

/**
 * Подстановка ника игрока в шаблоне ответа.
 */
const NICKNAME_TOKEN = /\{nickname\}/g;

/**
 * Входящие обращения администрации: список с отбором слева, переписка
 * и поле ответа справа. Шаблоны ответов вставляются в поле одним кликом,
 * заметки видны только администрации.
 *
 * На узком экране показывается одна колонка: список или открытое обращение.
 */
@Component({
    selector: 'app-tickets-inbox',
    templateUrl: './tickets-inbox.component.html',
    styleUrl: './tickets-inbox.component.less',
    imports: [
        FormsModule,
        RouterLink,
        TranslatePipe,
        TuiIcon,
        EmptyStateComponent,
        ErrorStateComponent,
        AdminListSkeletonComponent,
        RelativeTimeComponent,
        TicketStatusComponent,
        TicketThreadComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsInboxComponent {
    private readonly api = inject(TicketApiService);
    private readonly peopleService = inject(TicketPeopleService);
    private readonly userService = inject(UserService);
    private readonly status = inject(RequestStatusService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Обращение из ссылки (`?tab=tickets&ticket=<id>`).
     */
    public readonly ticketId = input<string | null>(null);

    protected readonly filters = INBOX_FILTERS;
    protected readonly categories = TICKET_CATEGORIES;
    protected readonly limits = TICKET_LIMITS;
    protected readonly people = this.peopleService.people;
    protected readonly me = this.userService.userId;

    /**
     * Выбранная вкладка отбора.
     */
    protected readonly filter = signal<InboxFilter>('open');

    /**
     * Выбранная категория (`null` — все).
     */
    protected readonly category = signal<TicketCategory | null>(null);

    /**
     * Список (`null` — загружается).
     */
    protected readonly tickets = signal<Ticket[] | null>(null);

    /**
     * Токен следующей страницы.
     */
    protected readonly nextPageToken = signal<string | null>(null);

    /**
     * Список не загрузился.
     */
    protected readonly listFailed = signal(false);

    /**
     * Счётчики на вкладках.
     */
    protected readonly counters = signal<AdminTicketCounters | null>(null);

    /**
     * Открытое обращение: id и загруженная переписка.
     */
    protected readonly selectedId = signal<string | null>(null);
    protected readonly selected = signal<Ticket | null>(null);

    /**
     * Черновик ответа.
     */
    protected readonly draft = signal('');

    /**
     * Пишем заметку, а не ответ.
     */
    protected readonly internal = signal(false);

    /**
     * Идёт запрос записи.
     */
    protected readonly busy = signal(false);

    /**
     * Шаблоны ответов (`null` — ещё не загружены).
     */
    protected readonly replies = signal<SavedReply[] | null>(null);

    /**
     * Открыт выпадающий список шаблонов.
     */
    protected readonly repliesOpen = signal(false);

    /**
     * Поиск по шаблонам.
     */
    protected readonly replySearch = signal('');

    /**
     * Открыта настройка шаблонов.
     */
    protected readonly manageOpen = signal(false);

    /**
     * Редактируемый шаблон: id, `'new'` — новый, `null` — не редактируется.
     */
    protected readonly editingReply = signal<string | 'new' | null>(null);
    protected readonly replyTitle = signal('');
    protected readonly replyText = signal('');

    /**
     * Шаблоны под строку поиска.
     */
    protected readonly foundReplies = computed(() => {
        const query = this.replySearch().trim().toLowerCase();
        const list = this.replies() ?? [];
        return query
            ? list.filter((r) => r.title.toLowerCase().includes(query) || r.text.toLowerCase().includes(query))
            : list;
    });

    /**
     * Ник автора открытого обращения.
     */
    protected readonly authorName = computed(() => {
        const ticket = this.selected();
        return ticket ? (this.people()[ticket.authorId]?.name ?? '') : '';
    });

    public constructor() {
        // Ссылка из уведомления открывает обращение, даже если админка уже открыта.
        effect(() => {
            const id = this.ticketId();
            if (id) {
                untracked(() => this.open(id));
            }
        });

        if (!this.isBrowser) {
            return;
        }

        fromEvent(document, 'visibilitychange')
            .pipe(
                startWith(null),
                map(() => document.visibilityState === 'visible'),
                switchMap((visible) => (visible ? timer(0, REFRESH_MS) : EMPTY)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((tick) => {
                // Первый такт грузит список с нуля, последующие освежают его и открытое обращение.
                this.loadList();
                this.loadCounters();
                if (tick > 0) {
                    this.refreshSelected();
                }
            });
    }

    /**
     * Счётчик на вкладке отбора.
     *
     * @param item Вкладка.
     * @returns Число или `null`, если у вкладки нет счётчика.
     */
    protected count(item: InboxFilter): number | null {
        const c = this.counters();
        if (!c) {
            return null;
        }
        switch (item) {
            case 'open':
                return c.open;
            case 'mine':
                return c.openMine;
            case 'nobody':
                return c.openUnassigned;
            default:
                return null;
        }
    }

    /**
     * Переключает вкладку отбора.
     *
     * @param item Вкладка.
     */
    protected selectFilter(item: InboxFilter): void {
        if (item !== this.filter()) {
            this.filter.set(item);
            this.tickets.set(null);
            this.loadList();
        }
    }

    /**
     * Переключает категорию.
     *
     * @param value Категория или пустая строка — все.
     */
    protected selectCategory(value: string): void {
        this.category.set((value || null) as TicketCategory | null);
        this.tickets.set(null);
        this.loadList();
    }

    /**
     * Загружает первую страницу списка.
     */
    protected loadList(): void {
        const filterAtStart = this.filter();
        const categoryAtStart = this.category();
        this.request(this.api.adminList({ ...FILTER_QUERY[filterAtStart], category: categoryAtStart })).subscribe(
            (page) => {
                // Пока шёл запрос, отбор могли сменить.
                if (filterAtStart !== this.filter() || categoryAtStart !== this.category()) {
                    return;
                }
                if (!page) {
                    if (this.tickets() === null) {
                        this.listFailed.set(true);
                    }
                    return;
                }
                this.listFailed.set(false);
                this.tickets.set(page.tickets);
                this.nextPageToken.set(page.nextPageToken);
                this.peopleService.load(page.tickets.flatMap((t) => [t.authorId, t.assigneeId]));
            }
        );
    }

    /**
     * Догружает следующую страницу списка.
     */
    protected more(): void {
        const pageToken = this.nextPageToken();
        if (!pageToken) {
            return;
        }
        this.request(
            this.api.adminList({ ...FILTER_QUERY[this.filter()], category: this.category(), pageToken })
        ).subscribe((page) => {
            if (page) {
                this.tickets.update((list) => [...(list ?? []), ...page.tickets]);
                this.nextPageToken.set(page.nextPageToken);
                this.peopleService.load(page.tickets.map((t) => t.authorId));
            }
        });
    }

    /**
     * Открывает обращение.
     *
     * @param id Обращение.
     */
    protected open(id: string): void {
        if (this.selectedId() !== id) {
            this.selectedId.set(id);
            this.selected.set(null);
            this.draft.set('');
            this.internal.set(false);
        }
        this.request(this.api.adminGet(id)).subscribe((ticket) => {
            if (ticket && ticket.id === this.selectedId()) {
                this.show(ticket);
                this.loadCounters();
            }
        });
    }

    /**
     * Возвращается к списку (на узком экране) и убирает обращение из адреса.
     */
    protected closeTicket(): void {
        this.selectedId.set(null);
        this.selected.set(null);
        void this.router.navigate([], {
            queryParams: { ticket: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /**
     * Ключ перевода категории.
     *
     * @param category Категория.
     * @returns Ключ `tickets.category.*`.
     */
    protected categoryKey(category: TicketCategory): string {
        return `tickets.category.${TICKET_CATEGORIES.find((c) => c.value === category)?.key ?? 'other'}`;
    }

    /**
     * Ключ перевода статуса для администрации.
     *
     * @param status Статус.
     * @returns Ключ `tickets.status.staff.*`.
     */
    protected statusKey(status: Ticket['status']): string {
        return `tickets.status.staff.${status.replace('TICKET_STATUS_', '').toLowerCase()}`;
    }

    /**
     * Ник участника.
     *
     * @param id Пользователь.
     * @returns Ник или пустая строка.
     */
    protected nameOf(id: string): string {
        return this.people()[id]?.name ?? '';
    }

    /**
     * Отправляет ответ по Ctrl/⌘+Enter.
     *
     * @param event Нажатие клавиши.
     */
    protected onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.reply(false);
        }
    }

    /**
     * Отправляет ответ или заметку.
     *
     * @param close Закрыть обращение этим ответом.
     */
    protected reply(close: boolean): void {
        const ticket = this.selected();
        const text = this.draft().trim();
        if (!ticket || !text || this.busy()) {
            return;
        }
        const internal = this.internal();
        this.write(
            this.api.adminReply(ticket.id, text, internal, close && !internal),
            internal ? 'tickets.admin.toast.noted' : 'tickets.admin.toast.replied',
            () => {
                this.draft.set('');
                this.internal.set(false);
            }
        );
    }

    /**
     * Берёт обращение себе или отпускает его.
     */
    protected toggleAssign(): void {
        const ticket = this.selected();
        if (ticket) {
            this.update({ assignee_id: ticket.assigneeId === this.me ? '' : this.me });
        }
    }

    /**
     * Меняет категорию открытого обращения.
     *
     * @param value Категория.
     */
    protected changeCategory(value: string): void {
        if (value && value !== this.selected()?.category) {
            this.update({ category: value as TicketCategory });
        }
    }

    /**
     * Закрывает обращение без ответа после подтверждения.
     */
    protected closeWithoutReply(): void {
        this.confirm
            .open({
                title: this.i18n.translate('tickets.admin.setClosed'),
                text: this.i18n.translate('tickets.player.closeText'),
            })
            .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.update({ status: 'TICKET_STATUS_CLOSED' }));
    }

    /**
     * Возвращает обращение в «Ждут нас».
     */
    protected reopen(): void {
        this.update({ status: 'TICKET_STATUS_OPEN' });
    }

    /**
     * Открывает или закрывает список шаблонов; при первом открытии загружает его.
     */
    protected toggleReplies(): void {
        this.repliesOpen.update((open) => !open);
        if (this.repliesOpen()) {
            this.replySearch.set('');
            this.ensureReplies();
        }
    }

    /**
     * Вставляет шаблон в поле ответа, подставив ник игрока.
     *
     * @param reply Шаблон.
     */
    protected insertReply(reply: SavedReply): void {
        const text = reply.text.replace(
            NICKNAME_TOKEN,
            this.authorName() || this.i18n.translate('tickets.thread.unknown')
        );
        this.draft.update((draft) => (draft.trim() ? `${draft.trimEnd()}\n\n${text}` : text));
        this.repliesOpen.set(false);
    }

    /**
     * Открывает настройку шаблонов.
     */
    protected openManage(): void {
        this.repliesOpen.set(false);
        this.manageOpen.set(true);
        this.ensureReplies();
    }

    /**
     * Начинает редактировать шаблон.
     *
     * @param reply Шаблон или `null` — новый.
     */
    protected editReply(reply: SavedReply | null): void {
        this.editingReply.set(reply?.id ?? 'new');
        this.replyTitle.set(reply?.title ?? '');
        this.replyText.set(reply?.text ?? '');
    }

    /**
     * Сохраняет редактируемый шаблон.
     */
    protected saveReply(): void {
        const editing = this.editingReply();
        const title = this.replyTitle().trim();
        const text = this.replyText().trim();
        if (!editing || !title || !text || this.busy()) {
            return;
        }
        const request =
            editing === 'new' ? this.api.createReply(title, text) : this.api.updateReply(editing, title, text);
        this.busy.set(true);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (saved) => {
                this.busy.set(false);
                this.editingReply.set(null);
                this.replies.update((list) =>
                    [...(list ?? []).filter((r) => r.id !== saved.id), saved].sort((a, b) =>
                        a.title.localeCompare(b.title)
                    )
                );
                this.status.showSuccess(this.i18n.translate('tickets.admin.toast.replySaved'));
            },
            error: () => {
                this.busy.set(false);
                this.status.showError(this.i18n.translate('tickets.admin.toast.failed'));
            },
        });
    }

    /**
     * Удаляет шаблон после подтверждения.
     *
     * @param reply Шаблон.
     */
    protected deleteReply(reply: SavedReply): void {
        this.confirm
            .open({
                title: this.i18n.translate('tickets.admin.replies.deleteTitle'),
                text: this.i18n.translate('tickets.admin.replies.deleteText', { title: reply.title }),
            })
            .pipe(
                filter(Boolean),
                switchMap(() => this.api.deleteReply(reply.id)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.replies.update((list) => (list ?? []).filter((r) => r.id !== reply.id));
                    this.status.showSuccess(this.i18n.translate('tickets.admin.toast.replyDeleted'));
                },
                error: () => this.status.showError(this.i18n.translate('tickets.admin.toast.failed')),
            });
    }

    /**
     * Загружает шаблоны, если ещё не загружены.
     */
    private ensureReplies(): void {
        if (this.replies() !== null) {
            return;
        }
        this.request(this.api.listReplies()).subscribe((list) => this.replies.set(list ?? []));
    }

    /**
     * Освежает открытое обращение, если в него сейчас никто не пишет.
     */
    private refreshSelected(): void {
        const id = this.selectedId();
        if (!id || this.busy()) {
            return;
        }
        this.request(this.api.adminGet(id)).subscribe((ticket) => {
            if (ticket && ticket.id === this.selectedId() && !this.busy()) {
                this.show(ticket);
            }
        });
    }

    /**
     * Загружает счётчики вкладок.
     */
    private loadCounters(): void {
        this.request(this.api.adminCounters()).subscribe((counters) => {
            if (counters) {
                this.counters.set(counters);
            }
        });
    }

    /**
     * Меняет обращение и показывает итог.
     *
     * @param patch Изменения.
     */
    private update(patch: AdminTicketPatch): void {
        const ticket = this.selected();
        if (ticket) {
            this.write(this.api.adminUpdate(ticket.id, patch), 'tickets.admin.toast.updated');
        }
    }

    /**
     * Выполняет запрос записи по открытому обращению.
     *
     * @param request Запрос.
     * @param successKey Ключ сообщения об успехе.
     * @param after Что сделать после успеха.
     */
    private write(request: Observable<Ticket>, successKey: string, after?: () => void): void {
        this.busy.set(true);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (ticket) => {
                this.busy.set(false);
                this.show(ticket);
                after?.();
                this.status.showSuccess(this.i18n.translate(successKey));
                this.loadList();
                this.loadCounters();
            },
            error: () => {
                this.busy.set(false);
                this.status.showError(this.i18n.translate('tickets.admin.toast.failed'));
            },
        });
    }

    /**
     * Показывает обращение, отражает его в списке и догружает участников.
     *
     * @param ticket Обращение.
     */
    private show(ticket: Ticket): void {
        this.selected.set(ticket);
        this.tickets.update(
            (list) => list?.map((item) => (item.id === ticket.id ? { ...ticket, messages: [] } : item)) ?? null
        );
        this.peopleService.load([ticket.authorId, ticket.assigneeId, ...ticket.messages.map((m) => m.authorId)]);
    }

    /**
     * Запрос без всплывающих ошибок: сбой превращается в `null`.
     *
     * @param source Запрос.
     * @returns Запрос, который не падает.
     */
    private request<T>(source: Observable<T>): Observable<T | null> {
        return source.pipe(
            catchError(() => of(null)),
            takeUntilDestroyed(this.destroyRef)
        );
    }
}
