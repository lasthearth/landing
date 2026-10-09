import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import {
    BANNER_EFFECTS,
    BANNER_NONE,
    BannerEffectId,
    FRAME_EFFECTS,
    FrameEffectId,
    PlayerFrameComponent,
    PROFILE_BANNERS,
    PROFILE_FRAMES,
    ProfileBannerComponent,
    ProfileFrameId,
    PlayerLookService,
    styleEarned,
    styleLock,
    StyleRequirement,
    StyleStats,
} from '@entities/player-style';
import { DonateService } from '@entities/donate';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { ProfileStyleService } from '../../api/profile-style.service';
import { PlayerBadgeKey } from '../../model/player-badge';
import { PlayerProfile } from '../../model/player-profile';

/**
 * Редактор оформления профиля: баннер, рамка аватара, их анимации и титул с живым
 * предпросмотром. Закрытые варианты видны с замком и подсказкой, как их открыть.
 *
 * Каждый выбор сразу сохраняется на сервере и виден всем игрокам.
 */
@Component({
    selector: 'app-profile-style-editor',
    templateUrl: './profile-style-editor.component.html',
    styleUrl: './profile-style-editor.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe, PlayerFrameComponent, ProfileBannerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileStyleEditorComponent {
    private readonly styles = inject(ProfileStyleService);
    private readonly looks = inject(PlayerLookService);
    private readonly donate = inject(DonateService);
    private readonly confirm = inject(ConfirmDialogService);

    /**
     * Свой профиль игрока.
     */
    public readonly profile = input.required<PlayerProfile>();

    /**
     * От чего зависят открытые элементы: с сервера, а пока он не ответил —
     * из профиля (то, чего в профиле нет, считается неоткрытым).
     */
    protected readonly stats = computed(
        (): StyleStats =>
            this.looks.myStanding() ?? {
                ...this.profile(),
                hgWins: this.profile().hungerGames?.wins,
            }
    );

    /**
     * Баланс осколков (`null` — неизвестен).
     */
    protected readonly balance = signal<number | null>(null);

    /**
     * Баннер, который сейчас покупается.
     */
    protected readonly buying = signal<string | null>(null);

    /**
     * Текущее оформление.
     */
    protected readonly style = computed(() => this.styles.styleOf(this.profile()));

    /**
     * Баннеры с признаком «закрыт» и подсказкой. Первой — «Без баннера»:
     * не из каталога, всегда открыта.
     */
    protected readonly banners = computed(() => [
        { ...BANNER_NONE, lock: null, earned: styleEarned(BANNER_NONE.requirement), price: null },
        ...PROFILE_BANNERS.map((banner) => ({
            ...banner,
            ...this.status(banner.requirement, banner.id),
            price: banner.requirement.kind === 'purchase' ? banner.requirement.price : null,
        })),
    ]);

    /**
     * Рамки с признаком «закрыта» и подсказкой.
     */
    protected readonly frames = computed(() =>
        PROFILE_FRAMES.map((frame) => ({ ...frame, ...this.status(frame.requirement, frame.id) }))
    );

    /**
     * Анимации баннера с признаком «закрыта».
     */
    protected readonly bannerEffects = computed(() =>
        BANNER_EFFECTS.map((effect) => ({ ...effect, ...this.status(effect.requirement, effect.id) }))
    );

    /**
     * Анимации рамки с признаком «закрыта».
     */
    protected readonly frameEffects = computed(() =>
        FRAME_EFFECTS.map((effect) => ({ ...effect, ...this.status(effect.requirement, effect.id) }))
    );

    /**
     * Выбранный баннер; «без баннера» — пустая плитка.
     */
    protected readonly banner = computed(() => {
        const id = this.style().bannerId;
        if (id === BANNER_NONE.id) {
            return BANNER_NONE;
        }

        return PROFILE_BANNERS.find((banner) => banner.id === id) ?? PROFILE_BANNERS[0];
    });

    /**
     * Выбранный титул.
     */
    protected readonly title = computed(
        () => this.profile().badges.find((badge) => badge.key === this.style().titleKey) ?? null
    );

    /**
     * Сколько вариантов открыто из всех.
     */
    protected readonly openedCount = computed(
        () =>
            [...this.banners(), ...this.bannerEffects(), ...this.frames(), ...this.frameEffects()].filter(
                (item) => !item.lock
            ).length
    );

    protected readonly totalCount =
        PROFILE_BANNERS.length + BANNER_EFFECTS.length + PROFILE_FRAMES.length + FRAME_EFFECTS.length + 1;

    /**
     * Состояние сохранения: показывается в шапке редактора.
     */
    protected readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error' | 'noFunds'>('idle');

    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сколько сохранений ещё в пути.
     */
    private pending = 0;

    public constructor() {
        this.looks.loadMyStanding().pipe(takeUntilDestroyed()).subscribe({ error: () => undefined });
        this.donate
            .getMyBalance$()
            .pipe(
                map((response) => Number(response.coins)),
                catchError(() => of(null)),
                takeUntilDestroyed()
            )
            .subscribe((coins) => this.balance.set(Number.isFinite(coins) ? coins : null));
    }

    /**
     * Выбирает баннер. «Без баннера» сбрасывает и анимацию — эффекту нечего
     * ложиться на пустую шапку.
     *
     * @param id Идентификатор баннера.
     */
    protected selectBanner(id: string): void {
        this.persist(
            this.styles.update(
                this.profile(),
                id === BANNER_NONE.id ? { bannerId: id, bannerEffect: 'none' } : { bannerId: id }
            )
        );
    }

    /**
     * Нажатие на баннер: открытый — выбрать, продающийся — купить.
     */
    protected pickBanner(item: { id: string; lock: unknown; price: number | null }): void {
        if (!item.lock) {
            this.selectBanner(item.id);
        } else if (item.price) {
            this.buy(item.id);
        }
    }

    /**
     * Покупает баннер за осколки после подтверждения и сразу ставит его.
     */
    private buy(id: string): void {
        if (this.buying()) {
            return;
        }
        this.confirm
            .open({ title: 'player.style.buy.title', text: 'player.style.buy.text' })
            .pipe(
                filter(Boolean),
                switchMap(() => {
                    this.buying.set(id);
                    this.saveState.set('saving');
                    return this.looks.buyBanner(id);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.buying.set(null);
                    this.donate.notifyBalanceChanged();
                    this.balance.update((coins) => (coins === null ? null : coins - (this.priceOf(id) ?? 0)));
                    this.selectBanner(id);
                },
                error: (err: { status?: number }) => {
                    this.buying.set(null);
                    this.saveState.set(err?.status === 412 ? 'noFunds' : 'error');
                },
            });
    }

    private priceOf(id: string): number | null {
        return this.banners().find((banner) => banner.id === id)?.price ?? null;
    }

    protected selectBannerEffect(id: BannerEffectId): void {
        this.persist(this.styles.update(this.profile(), { bannerEffect: id }));
    }

    protected selectFrameEffect(id: FrameEffectId): void {
        this.persist(this.styles.update(this.profile(), { frameEffect: id }));
    }

    protected selectFrame(id: ProfileFrameId): void {
        this.persist(this.styles.update(this.profile(), { frameId: id }));
    }

    protected selectTitle(key: PlayerBadgeKey | null): void {
        this.persist(this.styles.update(this.profile(), { titleKey: key }));
    }

    protected reset(): void {
        this.persist(this.styles.reset(this.profile()));
    }

    /**
     * Закрыт ли элемент (и что осталось) и за что он открывается.
     */
    private status(requirement: StyleRequirement, id: string) {
        return { lock: styleLock(requirement, this.stats(), id), earned: styleEarned(requirement) };
    }

    /**
     * Отправляет изменение на сервер и показывает, как оно прошло.
     * Выбор виден сразу; при ошибке сервис возвращает прежний.
     */
    private persist(request: Observable<void>): void {
        this.pending++;
        this.saveState.set('saving');
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.pending--;
                if (!this.pending) {
                    this.saveState.set('saved');
                }
            },
            error: () => {
                this.pending--;
                this.saveState.set('error');
            },
        });
    }
}
