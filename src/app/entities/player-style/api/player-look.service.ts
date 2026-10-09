import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isOwner, ISettlement, SettlementService } from '@entities/settlement';
// Прямые пути, а не '@entities/user': чип игрока из user сам использует эту сущность.
import { UserService } from '@entities/user/api/user.service';
import { ILeaderBoard } from '@entities/user/model/i-leader-board';
import { catchError, combineLatest, map, Observable, of, tap } from 'rxjs';
import { BANNER_EFFECTS, FRAME_EFFECTS, PROFILE_BANNERS, PROFILE_FRAMES } from '../lib/player-style.constant';
import { bannerById, defaultPlayerLook, styleCheckable, styleLock } from '../lib/style-lock.function';
import { AppearanceDto, StandingDto } from '../model/appearance.dto';
import {
    BannerEffectId,
    FrameEffectId,
    PlayerLook,
    ProfileBanner,
    ProfileFrameId,
    StyleRequirement,
    StyleStats,
} from '../model/player-style';
import { AppearanceApiService } from './appearance.api';

/**
 * Сохранённый выбор игрока: вид и титул.
 */
interface SavedLook {
    readonly look: PlayerLook;
    /**
     * Ключ значка-титула; пусто — без титула.
     */
    readonly titleKey: string;
}

/**
 * Статистика игрока, которого нет в таблице лидеров: ему открыто только бесплатное.
 */
const NO_STATS: StyleStats = { hours: 0, kills: 0, deaths: 0, hoursRank: 0, killsRank: 0, settlementRole: null };

/**
 * Как выглядят игроки на сайте: баннер, рамка аватара и анимации.
 *
 * Выбор хранится на сервере и виден всем. Кто ничего не выбирал — показывается
 * с видом по умолчанию: самыми редкими из открытых ему баннером и рамкой.
 * Сохранённое, что игрок с тех пор потерял (например, выпал из топа), заменяется
 * видом по умолчанию.
 */
@Injectable({ providedIn: 'root' })
export class PlayerLookService {
    private readonly users = inject(UserService);
    private readonly settlements = inject(SettlementService);
    private readonly api = inject(AppearanceApiService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Сохранённые виды по идентификатору игрока.
     */
    private readonly saved = signal<ReadonlyMap<string, SavedLook>>(new Map());

    /**
     * Статистика всех игроков по идентификатору (`null` — ещё не загружена).
     */
    private readonly stats = signal<ReadonlyMap<string, StyleStats> | null>(null);

    private requested = false;

    /**
     * Своё положение с сервера: всё, от чего зависят открытые элементы
     * (`null` — ещё не загружено).
     */
    private readonly standing = signal<StyleStats | null>(null);

    /**
     * Своё положение (только для чтения).
     */
    public readonly myStanding = this.standing.asReadonly();

    /**
     * Вид игрока.
     *
     * @param userId Игрок (`null` — неизвестный).
     * @param stats Статистика, если уже есть под рукой; иначе берётся из таблицы лидеров.
     * @returns Вид.
     */
    public lookOf(userId: string | null | undefined, stats?: StyleStats | null): PlayerLook {
        this.load();
        const known = stats ?? this.statsOf(userId);
        const fallback = defaultPlayerLook(known === undefined ? null : known);
        const saved = userId ? this.saved().get(userId) : undefined;
        if (!saved) {
            return fallback;
        }
        // Пока статистика не пришла, верим сохранённому — иначе вид мигнёт.
        if (known === undefined) {
            return saved.look;
        }

        const checked = known ?? NO_STATS;
        // Что сайт проверить не может (покупки, победы в «Голодных играх»
        // чужого игрока), уже проверил сервер при сохранении.
        const open = <T extends string>(
            id: T,
            items: readonly { id: T; requirement: StyleRequirement }[],
            otherwise: T
        ): T => {
            const item = items.find((candidate) => candidate.id === id);
            if (!item) {
                return otherwise;
            }
            return !styleCheckable(item.requirement, checked) || !styleLock(item.requirement, checked, item.id)
                ? id
                : otherwise;
        };

        return {
            bannerId: open(saved.look.bannerId, PROFILE_BANNERS, fallback.bannerId),
            bannerEffect: open<BannerEffectId>(saved.look.bannerEffect, BANNER_EFFECTS, 'none'),
            frameId: open<ProfileFrameId>(saved.look.frameId, PROFILE_FRAMES, fallback.frameId),
            frameEffect: open<FrameEffectId>(saved.look.frameEffect, FRAME_EFFECTS, 'none'),
        };
    }

    /**
     * Сохранённый титул игрока: ключ значка, пусто — «без титула»,
     * `undefined` — игрок не выбирал.
     *
     * @param userId Игрок.
     * @returns Титул.
     */
    public titleOf(userId: string | null | undefined): string | undefined {
        this.load();
        return userId ? this.saved().get(userId)?.titleKey : undefined;
    }

    /**
     * Баннер игрока.
     *
     * @param userId Игрок.
     * @returns Баннер.
     */
    public bannerOf(userId: string | null | undefined): ProfileBanner {
        return bannerById(this.lookOf(userId).bannerId);
    }

    /**
     * Сохраняет свой вид. Показывается сразу; если сервер отказал — возвращается прежний.
     *
     * @param userId Свой идентификатор.
     * @param look Вид.
     * @param titleKey Титул; пусто — без титула.
     * @returns Завершение сохранения.
     */
    public save(userId: string, look: PlayerLook, titleKey: string): Observable<void> {
        const before = this.saved().get(userId);
        this.put(userId, { look, titleKey });

        return this.api
            .save({
                banner_id: look.bannerId,
                banner_effect: look.bannerEffect,
                frame_id: look.frameId,
                frame_effect: look.frameEffect,
                title_key: titleKey,
            })
            .pipe(
                tap({
                    next: (dto) => this.put(userId, toSaved(dto)),
                    error: () => this.put(userId, before),
                }),
                map(() => undefined)
            );
    }

    /**
     * Загружает своё положение с сервера.
     *
     * @returns Положение.
     */
    public loadMyStanding(): Observable<StyleStats> {
        return this.api.standing().pipe(
            map(toStats),
            tap((stats) => this.standing.set(stats))
        );
    }

    /**
     * Покупает баннер за осколки; после покупки он открыт.
     *
     * @param bannerId Баннер.
     * @returns Положение после покупки.
     */
    public buyBanner(bannerId: string): Observable<StyleStats> {
        return this.api.buyBanner(bannerId).pipe(
            map(toStats),
            tap((stats) => this.standing.set(stats))
        );
    }

    /**
     * Возвращает вид по умолчанию.
     *
     * @param userId Свой идентификатор.
     * @returns Завершение.
     */
    public reset(userId: string): Observable<void> {
        const before = this.saved().get(userId);
        this.put(userId, undefined);
        return this.api.reset().pipe(tap({ error: () => this.put(userId, before) }));
    }

    /**
     * Статистика игрока: `undefined` — ещё не загружена, `null` — игрока нет в таблице.
     */
    private statsOf(userId: string | null | undefined): StyleStats | null | undefined {
        const all = this.stats();
        if (!all) {
            return undefined;
        }
        return (userId && all.get(userId)) || null;
    }

    private put(userId: string, value: SavedLook | undefined): void {
        const next = new Map(this.saved());
        if (value) {
            next.set(userId, value);
        } else {
            next.delete(userId);
        }
        this.saved.set(next);
    }

    /**
     * Один раз подгружает сохранённые виды, статистику игроков и поселения.
     * Запрос уходит в микрозадаче: метод зовут из `computed`, где писать в сигналы нельзя.
     */
    private load(): void {
        if (this.requested || !this.isBrowser) {
            return;
        }
        this.requested = true;

        queueMicrotask(() => {
            this.api
                .list()
                .pipe(catchError(() => of([] as AppearanceDto[])))
                .subscribe((list) => {
                    // Свой выбор, сохранённый, пока список летел, не затираем.
                    const next = new Map(list.map((dto) => [dto.user_id, toSaved(dto)]));
                    for (const [id, value] of this.saved()) {
                        next.set(id, value);
                    }
                    this.saved.set(next);
                });

            combineLatest([
                this.users.getAllPlayersStats$(),
                this.settlements.getSettlements().pipe(catchError(() => of([] as ISettlement[]))),
            ]).subscribe(([entries, settlements]) => this.stats.set(collectStats(entries, settlements)));
        });
    }
}

/**
 * Положение из ответа сервера.
 */
function toStats(dto: StandingDto): StyleStats {
    const role = dto.settlement_role;
    return {
        hours: dto.hours ?? 0,
        kills: dto.kills ?? 0,
        deaths: dto.deaths ?? 0,
        hoursRank: dto.hours_rank ?? 0,
        killsRank: dto.kills_rank ?? 0,
        settlementRole: role === 'leader' || role === 'resident' ? role : null,
        hgWins: dto.hunger_games_wins ?? 0,
        referrals: dto.referrals ?? 0,
        events: dto.events ?? 0,
        days: dto.days ?? 0,
        purchased: dto.purchased_banner_ids ?? [],
    };
}

/**
 * Сохранённый вид из ответа сервера.
 */
function toSaved(dto: AppearanceDto): SavedLook {
    return {
        look: {
            bannerId: dto.banner_id,
            bannerEffect: dto.banner_effect as BannerEffectId,
            frameId: dto.frame_id as ProfileFrameId,
            frameEffect: dto.frame_effect as FrameEffectId,
        },
        titleKey: dto.title_key ?? '',
    };
}

/**
 * Статистика для оформления по каждому игроку.
 *
 * @param entries Таблица лидеров.
 * @param settlements Поселения.
 * @returns Статистика по идентификатору игрока.
 */
function collectStats(entries: ILeaderBoard[], settlements: ISettlement[]): Map<string, StyleStats> {
    const rank = (value: (entry: ILeaderBoard) => number): Map<string, number> => {
        const sorted = entries.map(value).sort((a, b) => b - a);
        // Место = сколько игроков строго впереди + 1.
        return new Map(entries.map((entry) => [entry.user_id, sorted.indexOf(value(entry)) + 1]));
    };
    const hoursRank = rank((entry) => entry.hours_played);
    const killsRank = rank((entry) => entry.kills);

    const roles = new Map<string, 'leader' | 'resident'>();
    for (const settlement of settlements) {
        for (const member of settlement.members ?? []) {
            roles.set(member.user_id, isOwner(settlement, member.user_id) ? 'leader' : 'resident');
        }
        if (settlement.leader?.user_id) {
            roles.set(settlement.leader.user_id, 'leader');
        }
    }

    return new Map(
        entries.map((entry) => [
            entry.user_id,
            {
                hours: entry.hours_played,
                kills: entry.kills,
                deaths: entry.deaths,
                hoursRank: hoursRank.get(entry.user_id) ?? 0,
                killsRank: killsRank.get(entry.user_id) ?? 0,
                settlementRole: roles.get(entry.user_id) ?? null,
            },
        ])
    );
}
