import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    Ticket,
    TICKET_CATEGORIES,
    TICKET_LIMITS,
    TicketApiService,
    TicketStatusComponent,
    TicketThreadComponent,
} from '@entities/ticket';
import { UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, filter, fromEvent, map, of, startWith, switchMap, timer } from 'rxjs';
import { TicketPeopleService } from '../../api/ticket-people.service';
import { ticketErrorKey } from '../../lib/ticket-error-key.function';

/**
 * Как часто подтягивать новые ответы, пока вкладка видна (мс).
 */
const REFRESH_MS = 20_000;

/**
 * Переписка одного обращения игрока: лента, ответ, закрыть или открыть снова.
 */
@Component({
    selector: 'app-support-ticket-page',
    templateUrl: './support-ticket-page.component.html',
    styleUrl: './support-ticket-page.component.less',
    imports: [
        FormsModule,
        RouterLink,
        TranslatePipe,
        TuiIcon,
        ErrorStateComponent,
        SkeletonComponent,
        TicketStatusComponent,
        TicketThreadComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportTicketPageComponent {
    private readonly api = inject(TicketApiService);
    private readonly peopleService = inject(TicketPeopleService);
    private readonly userService = inject(UserService);
    private readonly status = inject(RequestStatusService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    protected readonly limits = TICKET_LIMITS;
    protected readonly people = this.peopleService.people;

    /**
     * Обращение (`null` — ещё не загружено).
     */
    protected readonly ticket = signal<Ticket | null>(null);

    /**
     * Обращение не найдено или не своё.
     */
    protected readonly missing = signal(false);

    /**
     * Черновик ответа.
     */
    protected readonly draft = signal('');

    /**
     * Идёт запрос записи.
     */
    protected readonly busy = signal(false);

    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        const id$ = this.route.paramMap.pipe(map((params) => params.get('id') ?? ''));
        id$.pipe(
            switchMap((id) =>
                // Пока вкладка видна, обновляем переписку: ответ администрации появится сам.
                fromEvent(document, 'visibilitychange').pipe(
                    startWith(null),
                    map(() => document.visibilityState === 'visible'),
                    switchMap((visible) => (visible ? timer(0, REFRESH_MS) : EMPTY)),
                    filter(() => !this.busy()),
                    switchMap(() =>
                        this.api.get(id).pipe(
                            catchError(() => {
                                if (this.ticket() === null) {
                                    this.missing.set(true);
                                }
                                return of(null);
                            })
                        )
                    )
                )
            ),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((ticket) => {
            if (ticket) {
                this.show(ticket);
            }
        });
    }

    /**
     * Ключ перевода категории.
     *
     * @param ticket Обращение.
     * @returns Ключ `tickets.category.*`.
     */
    protected categoryKey(ticket: Ticket): string {
        return `tickets.category.${TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.key ?? 'other'}`;
    }

    /**
     * Отправляет ответ по Ctrl/⌘+Enter.
     *
     * @param event Нажатие клавиши.
     */
    protected onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.send();
        }
    }

    /**
     * Отправляет сообщение.
     */
    protected send(): void {
        const ticket = this.ticket();
        const text = this.draft().trim();
        if (!ticket || !text || this.busy()) {
            return;
        }
        this.write(this.api.post(ticket.id, text), 'tickets.player.toast.sent', () => this.draft.set(''));
    }

    /**
     * Закрывает обращение после подтверждения.
     */
    protected close(): void {
        const ticket = this.ticket();
        if (!ticket) {
            return;
        }
        this.confirm
            .open({
                title: this.i18n.translate('tickets.player.closeTitle'),
                text: this.i18n.translate('tickets.player.closeText'),
            })
            .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.write(this.api.close(ticket.id), 'tickets.player.toast.closed'));
    }

    /**
     * Открывает закрытое обращение снова.
     */
    protected reopen(): void {
        const ticket = this.ticket();
        if (ticket) {
            this.write(this.api.reopen(ticket.id), 'tickets.player.toast.reopened');
        }
    }

    /**
     * Выполняет запрос записи и показывает итог.
     *
     * @param request Запрос.
     * @param successKey Ключ сообщения об успехе.
     * @param after Что сделать после успеха.
     */
    private write(request: ReturnType<TicketApiService['get']>, successKey: string, after?: () => void): void {
        this.busy.set(true);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (ticket) => {
                this.busy.set(false);
                this.show(ticket);
                after?.();
                this.status.showSuccess(this.i18n.translate(successKey));
            },
            error: (error: unknown) => {
                this.busy.set(false);
                this.status.showError(this.i18n.translate(ticketErrorKey(error)));
            },
        });
    }

    /**
     * Показывает обращение и догружает участников переписки.
     *
     * @param ticket Обращение.
     */
    private show(ticket: Ticket): void {
        this.ticket.set(ticket);
        this.missing.set(false);
        this.peopleService.load([this.userService.userId, ...ticket.messages.map((m) => m.authorId)]);
    }
}
