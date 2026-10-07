import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { IInviteLink, ISettlement, SettlementService } from '@entities/settlement';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, filter, of, switchMap } from 'rxjs';

/**
 * Варианты срока ссылки (часы; 0 — бессрочно).
 */
const TTL_OPTIONS = [
    { hours: 24, key: 'day' },
    { hours: 168, key: 'week' },
    { hours: 720, key: 'month' },
    { hours: 0, key: 'forever' },
] as const;

/**
 * Варианты числа вступлений (0 — без ограничений).
 */
const USES_OPTIONS = [
    { uses: 1, key: 'one' },
    { uses: 5, key: 'five' },
    { uses: 25, key: 'many' },
    { uses: 0, key: 'unlimited' },
] as const;

/**
 * Ссылки-приглашения поселения: создать, скопировать, отозвать.
 *
 * Видна тем, кто может приглашать. Кто откроет ссылку и прошёл проверку
 * анкеты, сразу становится жителем.
 */
@Component({
    selector: 'app-invite-links-panel',
    templateUrl: './invite-links-panel.component.html',
    styleUrl: './invite-links-panel.component.less',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteLinksPanelComponent {
    private readonly settlementService = inject(SettlementService);
    private readonly status = inject(RequestStatusService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly i18n = inject(I18nService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    public readonly settlement = input.required<ISettlement>();

    protected readonly ttlOptions = TTL_OPTIONS;
    protected readonly usesOptions = USES_OPTIONS;

    protected readonly ttl = signal<number>(168);
    protected readonly uses = signal<number>(0);

    /**
     * Ссылки (`null` — ещё не загружены).
     */
    protected readonly links = signal<IInviteLink[] | null>(null);
    protected readonly busy = signal(false);

    /**
     * Ссылка, скопированная последней (для галочки).
     */
    protected readonly copiedId = signal<string | null>(null);

    /**
     * Действующие ссылки первыми, потом истёкшие.
     */
    protected readonly sorted = computed(() => {
        const links = this.links() ?? [];
        const active = links.filter((link) => link.status === 'INVITE_LINK_STATUS_ACTIVE');
        return [...active, ...links.filter((link) => link.status !== 'INVITE_LINK_STATUS_ACTIVE')];
    });

    public constructor() {
        effect(() => {
            const id = this.settlement().id;
            if (this.isBrowser) {
                this.load(id);
            }
        });
    }

    /**
     * Адрес ссылки.
     *
     * @param link Ссылка.
     * @returns Полный URL.
     */
    protected urlOf(link: IInviteLink): string {
        const origin = this.isBrowser ? window.location.origin : 'https://lasthearth.ru';
        return `${origin}/join/${link.code}`;
    }

    /**
     * Подпись «Вступили: 3 из 5».
     *
     * @param link Ссылка.
     * @returns Текст.
     */
    protected usesOf(link: IInviteLink): string {
        const uses = link.uses ?? 0;
        const max = link.max_uses ?? 0;
        return max > 0
            ? this.i18n.translate('settlements.inviteLinks.usesCount', { uses, max })
            : this.i18n.translate('settlements.inviteLinks.usesCountUnlimited', { uses });
    }

    /**
     * Подпись срока: «до 14 октября» или «бессрочно».
     *
     * @param link Ссылка.
     * @returns Текст.
     */
    protected expiresOf(link: IInviteLink): string {
        if (!link.expires_at) {
            return this.i18n.translate('settlements.inviteLinks.noExpiry');
        }
        const date = new Intl.DateTimeFormat(this.i18n.language(), {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(link.expires_at));
        return this.i18n.translate('settlements.inviteLinks.expires', { date });
    }

    /**
     * Создаёт ссылку и сразу копирует её.
     */
    protected create(): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);
        this.settlementService
            .createInviteLink$(this.settlement().id, { ttl_hours: this.ttl(), max_uses: this.uses() })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (link) => {
                    this.busy.set(false);
                    this.links.update((links) => [link, ...(links ?? [])]);
                    void this.copy(link, false);
                    this.status.showSuccess(this.i18n.translate('settlements.inviteLinks.created'));
                },
                error: (error: unknown) => {
                    this.busy.set(false);
                    const limit = error instanceof HttpErrorResponse && error.status === 429;
                    this.status.showError(
                        this.i18n.translate(
                            limit ? 'settlements.inviteLinks.errors.limit' : 'settlements.inviteLinks.errors.generic'
                        )
                    );
                },
            });
    }

    /**
     * Копирует ссылку в буфер обмена.
     *
     * @param link Ссылка.
     * @param notify Показать ли уведомление.
     */
    protected async copy(link: IInviteLink, notify = true): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.urlOf(link));
            this.copiedId.set(link.id);
            if (notify) {
                this.status.showSuccess(this.i18n.translate('settlements.inviteLinks.copied'));
            }
        } catch {
            // Буфер недоступен (нет разрешения) — ссылка видна и выделяется вручную.
        }
    }

    /**
     * Отзывает ссылку после подтверждения.
     *
     * @param link Ссылка.
     */
    protected revoke(link: IInviteLink): void {
        this.confirm
            .open({
                title: this.i18n.translate('settlements.inviteLinks.revokeTitle'),
                text: this.i18n.translate('settlements.inviteLinks.revokeText'),
            })
            .pipe(
                filter(Boolean),
                switchMap(() => this.settlementService.revokeInviteLink$(this.settlement().id, link.id)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.links.update((links) => links?.filter((item) => item.id !== link.id) ?? null);
                    this.status.showSuccess(this.i18n.translate('settlements.inviteLinks.revoked'));
                },
                error: () => this.status.showError(this.i18n.translate('settlements.inviteLinks.errors.generic')),
            });
    }

    /**
     * Загружает ссылки поселения.
     *
     * @param settlementId Поселение.
     */
    private load(settlementId: string): void {
        this.settlementService
            .getInviteLinks$(settlementId)
            .pipe(
                catchError(() => of([] as IInviteLink[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((links) => this.links.set(links));
    }
}
