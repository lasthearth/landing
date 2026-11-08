import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { Ticket, TICKET_CATEGORIES, TICKET_LIMITS, TicketApiService, TicketStatusComponent } from '@entities/ticket';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, of } from 'rxjs';
import { TicketFormComponent } from '../ticket-form/ticket-form.component';

/**
 * «Поддержка» в профиле: свои обращения и форма нового.
 */
@Component({
    selector: 'app-support-page',
    templateUrl: './support-page.component.html',
    styleUrl: './support-page.component.less',
    imports: [
        RouterLink,
        TranslatePipe,
        TuiIcon,
        PageHeaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        SkeletonComponent,
        RelativeTimeComponent,
        TicketStatusComponent,
        TicketFormComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPageComponent {
    private readonly api = inject(TicketApiService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly limits = TICKET_LIMITS;
    protected readonly skeletonRows = [0, 1, 2];

    /**
     * Обращения (`null` — ещё не загружены).
     */
    protected readonly tickets = signal<Ticket[] | null>(null);

    /**
     * Токен следующей страницы.
     */
    protected readonly nextPageToken = signal<string | null>(null);

    /**
     * Ошибка загрузки.
     */
    protected readonly failed = signal(false);

    /**
     * Открыта форма нового обращения.
     */
    protected readonly creating = signal(false);

    /**
     * Незакрытые обращения: их число ограничено.
     */
    protected readonly active = computed(
        () => (this.tickets() ?? []).filter((ticket) => ticket.status !== 'TICKET_STATUS_CLOSED').length
    );

    /**
     * Лимит незакрытых исчерпан.
     */
    protected readonly limitReached = computed(() => this.active() >= TICKET_LIMITS.activePerPlayer);

    public constructor() {
        this.load();
    }

    /**
     * Загружает первую страницу.
     */
    protected load(): void {
        this.failed.set(false);
        this.api
            .listMine()
            .pipe(
                catchError(() => {
                    this.failed.set(true);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((page) => {
                if (page) {
                    this.tickets.set(page.tickets);
                    this.nextPageToken.set(page.nextPageToken);
                }
            });
    }

    /**
     * Догружает следующую страницу.
     */
    protected more(): void {
        const token = this.nextPageToken();
        if (!token) {
            return;
        }
        this.api
            .listMine(token)
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((page) => {
                if (page) {
                    this.tickets.update((list) => [...(list ?? []), ...page.tickets]);
                    this.nextPageToken.set(page.nextPageToken);
                }
            });
    }

    /**
     * Обращение создано — открываем его переписку.
     *
     * @param ticket Новое обращение.
     */
    protected onCreated(ticket: Ticket): void {
        this.creating.set(false);
        void this.router.navigate(['/profile/support', ticket.id]);
    }

    /**
     * Ключ перевода категории.
     *
     * @param ticket Обращение.
     * @returns Ключ `tickets.category.*`.
     */
    protected categoryKey(ticket: Ticket): string {
        const item = TICKET_CATEGORIES.find((c) => c.value === ticket.category);
        return `tickets.category.${item?.key ?? 'other'}`;
    }

    /**
     * Иконка категории.
     *
     * @param ticket Обращение.
     * @returns Имя иконки.
     */
    protected categoryIcon(ticket: Ticket): string {
        return TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.icon ?? '@tui.message-square';
    }
}
