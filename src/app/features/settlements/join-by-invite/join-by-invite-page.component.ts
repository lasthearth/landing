import { isPlatformBrowser } from '@angular/common';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    getOwnerIds,
    getSettlementDisplayName,
    getSettlementTypeTone,
    IInviteLinkPreview,
    ISettlement,
    SettlementBadgeComponent,
    SettlementService,
} from '@entities/settlement';
import { getSettlementTypeByKey } from '@entities/settlement';
import { IPlayer, PlayerChipComponent, UserService } from '@entities/user';
import { MarkupPipe } from '@shared/lib/news-markdown';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { PendingInviteService } from './api/pending-invite.service';

/**
 * Что показывает страница.
 */
type InviteState = { status: 'loading' } | { status: 'not-found' } | { status: 'ready'; preview: IInviteLinkPreview };

/**
 * Страница ссылки-приглашения `/join/<код>`: поселение, кто приглашает и
 * кнопка «Вступить» — или объяснение, почему вступить нельзя.
 */
@Component({
    selector: 'app-join-by-invite-page',
    templateUrl: './join-by-invite-page.component.html',
    styleUrl: './join-by-invite-page.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe, SettlementBadgeComponent, PlayerChipComponent, MarkupPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinByInvitePageComponent {
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);
    private readonly pending = inject(PendingInviteService);
    private readonly status = inject(RequestStatusService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Код из ссылки.
     */
    protected readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

    protected readonly state = signal<InviteState>({ status: 'loading' });

    /**
     * Поселение, в котором уже состоит игрок (`undefined` — ещё не известно).
     */
    protected readonly mySettlement = signal<ISettlement | null | undefined>(undefined);

    /**
     * Игроки (главы и пригласивший) по идентификатору.
     */
    protected readonly players = signal<Record<string, IPlayer>>({});

    protected readonly joining = signal(false);

    private readonly authed = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Вошедший игрок (`null` — гость).
     */
    protected readonly userId = computed(() => (this.authed() ? this.userService.userId : null));

    /**
     * Прошёл ли игрок проверку анкеты.
     */
    protected readonly verified = computed(() => {
        this.authed();
        const roles = this.userService.roles;
        return roles.includes('player') || roles.includes('admin');
    });

    protected readonly preview = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.preview : null;
    });

    protected readonly settlement = computed(() => this.preview()?.settlement ?? null);

    protected readonly active = computed(() => this.preview()?.status === 'INVITE_LINK_STATUS_ACTIVE');

    protected readonly ownerIds = computed(() => {
        const settlement = this.settlement();
        return settlement ? getOwnerIds(settlement) : [];
    });

    protected readonly typeLabel = computed(() => {
        const settlement = this.settlement();
        return settlement ? getSettlementTypeByKey(settlement.type) : '';
    });

    protected readonly typeTone = computed(() => {
        const settlement = this.settlement();
        return settlement ? getSettlementTypeTone(settlement) : ('line' as const);
    });

    protected readonly name = computed(() => {
        const settlement = this.settlement();
        return settlement ? getSettlementDisplayName(settlement) : '';
    });

    /**
     * «до 14 октября» для срока ссылки.
     */
    protected readonly validUntil = computed(() => {
        const expires = this.preview()?.expires_at;
        return expires
            ? new Intl.DateTimeFormat(this.i18n.language(), { day: 'numeric', month: 'long' }).format(new Date(expires))
            : null;
    });

    /**
     * Сколько мест осталось по ссылке (`null` — без ограничений).
     */
    protected readonly usesLeft = computed(() => {
        const preview = this.preview();
        const max = preview?.max_uses ?? 0;
        return max > 0 ? Math.max(0, max - (preview?.uses ?? 0)) : null;
    });

    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        this.settlementService
            .getInviteLink$(this.code)
            .pipe(
                map((preview): InviteState => ({ status: 'ready', preview })),
                catchError(() => of<InviteState>({ status: 'not-found' })),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((state) => {
                this.state.set(state);
                if (state.status === 'ready') {
                    this.loadPlayers(state.preview);
                    if (state.preview.status !== 'INVITE_LINK_STATUS_ACTIVE') {
                        this.forgetIfPending();
                    }
                } else {
                    this.forgetIfPending();
                }
            });

        this.userService.authState$
            .pipe(
                switchMap((isAuth) =>
                    isAuth && this.userService.userId
                        ? this.settlementService
                              .getSettlementInfo(this.userService.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
                              .pipe(catchError(() => of(null)))
                        : of(null)
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((settlement) => this.mySettlement.set(settlement ?? null));
    }

    /**
     * Гость: запоминаем приглашение и идём входить.
     */
    protected signIn(): void {
        this.pending.save(this.code, this.name(), true);
        this.userService.signIn();
    }

    /**
     * Игрок без проверенной анкеты: приглашение подождёт в профиле.
     */
    protected toApplication(): void {
        this.pending.save(this.code, this.name(), false);
        void this.router.navigate(['/profile']);
    }

    /**
     * Вступает в поселение.
     */
    protected join(): void {
        if (this.joining()) {
            return;
        }

        this.joining.set(true);
        this.settlementService.joinByInviteLink$(this.code).subscribe({
            next: (settlementId) => {
                this.joining.set(false);
                this.pending.clear();
                this.status.showSuccess(this.i18n.translate('settlements.joinByInvite.joined', { name: this.name() }));
                void this.router.navigate(['/settlements', settlementId]);
            },
            error: (error: unknown) => {
                this.joining.set(false);
                const code = error instanceof HttpErrorResponse ? error.status : 0;
                this.status.showError(
                    this.i18n.translate(
                        code === 409
                            ? 'settlements.joinByInvite.errors.already'
                            : code === 412 || code === 404
                              ? 'settlements.joinByInvite.errors.gone'
                              : 'settlements.joinByInvite.errors.generic'
                    )
                );
            },
        });
    }

    /**
     * Игрок по идентификатору (пока ник не загружен — заглушка).
     *
     * @param userId Идентификатор.
     * @returns Игрок.
     */
    protected playerOf(userId: string): IPlayer {
        return (
            this.players()[userId] ?? {
                user_id: userId,
                user_game_name: '…',
                avatar: { original: '', x96: '', x48: '' },
                is_online: false,
            }
        );
    }

    /**
     * Догружает ники глав и пригласившего.
     *
     * @param preview Превью ссылки.
     */
    private loadPlayers(preview: IInviteLinkPreview): void {
        const ids = [...new Set([preview.created_by, ...getOwnerIds(preview.settlement)])].filter(Boolean);
        this.userService
            .getPlayersBatch$(ids)
            .pipe(
                catchError(() => of([] as IPlayer[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) =>
                this.players.set(Object.fromEntries(players.filter(Boolean).map((player) => [player.user_id, player])))
            );
    }

    /**
     * Недействующее приглашение больше не ждёт в профиле.
     */
    private forgetIfPending(): void {
        if (this.pending.invite()?.code === this.code) {
            this.pending.clear();
        }
    }
}
