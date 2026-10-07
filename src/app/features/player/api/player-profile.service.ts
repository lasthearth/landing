import { inject, Injectable } from '@angular/core';
import { ILeaderBoard, UserService } from '@entities/user';
import { isOwner, ISettlement, SettlementService } from '@entities/settlement';
import { HungerGamesService, IPlayerSeasonStats, ISeasonInfo } from '@features/hunger-games/api/hunger-games.service';
import { catchError, combineLatest, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { computePlayerBadges } from '../lib/compute-player-badges.function';
import { PlayerHungerGames, PlayerProfile } from '../model/player-profile';

/**
 * Собирает публичный профиль игрока из открытых данных: таблицы лидеров,
 * пользователей, поселений и «Голодных игр». Новых эндпоинтов не нужно.
 */
@Injectable({ providedIn: 'root' })
export class PlayerProfileService {
    private readonly users = inject(UserService);
    private readonly settlements = inject(SettlementService);
    private readonly hungerGames = inject(HungerGamesService);

    /**
     * Все поселения (кэш на сессию: профили открывают подряд).
     */
    private settlements$?: Observable<ISettlement[]>;

    /**
     * Сезон «Голодных игр» для профилей: идущий или последний (кэш).
     */
    private season$?: Observable<ISeasonInfo | null>;

    /**
     * Профиль игрока по нику (без учёта регистра).
     *
     * @param nickname Игровой ник.
     * @returns Профиль или `null`, если игрок ещё не появлялся в статистике сервера.
     */
    public load(nickname: string): Observable<PlayerProfile | null> {
        const key = nickname.trim().toLowerCase();

        return this.users.getAllPlayersStats$().pipe(
            switchMap((entries) => {
                const entry = entries.find((item) => item.name?.trim().toLowerCase() === key);

                if (!entry) {
                    return of(null);
                }

                return combineLatest([
                    this.player(entry.user_id),
                    this.settlementOf(entry.user_id),
                    this.hungerGamesOf(entry.user_id),
                ]).pipe(
                    map(([player, settlement, hungerGames]) =>
                        this.build(entry, entries, player, settlement, hungerGames)
                    )
                );
            })
        );
    }

    /**
     * Собирает профиль.
     */
    private build(
        entry: ILeaderBoard,
        entries: ILeaderBoard[],
        player: { avatarUrl: string; isOnline: boolean } | null,
        settlement: ISettlement | null,
        hungerGames: PlayerHungerGames | null
    ): PlayerProfile {
        const hoursRank = entries.filter((item) => item.hours_played > entry.hours_played).length + 1;
        const killsRank = entries.filter((item) => item.kills > entry.kills).length + 1;
        const settlementRole = settlement ? (isOwner(settlement, entry.user_id) ? 'leader' : 'resident') : null;

        return {
            nickname: entry.name,
            userId: entry.user_id,
            avatarUrl: player?.avatarUrl ?? '/default-avatar.webp',
            isOnline: player?.isOnline ?? false,
            lastOnline: entry.last_online || null,
            hours: entry.hours_played,
            kills: entry.kills,
            deaths: entry.deaths,
            hoursRank,
            killsRank,
            totalPlayers: entries.length,
            settlement,
            settlementRole,
            hungerGames,
            badges: computePlayerBadges({
                verified: true,
                hours: entry.hours_played,
                kills: entry.kills,
                deaths: entry.deaths,
                hoursRank,
                killsRank,
                settlementRole,
                hungerGamesWins: hungerGames?.wins ?? 0,
            }),
        };
    }

    /**
     * Аватар и статус «в игре».
     */
    private player(userId: string): Observable<{ avatarUrl: string; isOnline: boolean } | null> {
        if (!userId) {
            return of(null);
        }

        return this.users.getPlayersBatch$([userId]).pipe(
            map(([player]) =>
                player
                    ? {
                          avatarUrl:
                              player.avatar?.original ||
                              player.avatar?.x96 ||
                              player.avatar?.x48 ||
                              '/default-avatar.webp',
                          isOnline: !!player.is_online,
                      }
                    : null
            ),
            catchError(() => of(null))
        );
    }

    /**
     * Поселение, где состоит игрок.
     */
    private settlementOf(userId: string): Observable<ISettlement | null> {
        this.settlements$ ??= this.settlements.getSettlements().pipe(
            catchError(() => of([] as ISettlement[])),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.settlements$.pipe(
            map(
                (list) =>
                    list.find(
                        (settlement) =>
                            settlement.leader?.user_id === userId ||
                            settlement.members?.some((member) => member.user_id === userId)
                    ) ?? null
            )
        );
    }

    /**
     * Итоги в «Голодных играх» за идущий или последний сезон.
     */
    private hungerGamesOf(userId: string): Observable<PlayerHungerGames | null> {
        this.season$ ??= this.hungerGames.getSeasons$().pipe(
            map((seasons) => {
                const sorted = [...seasons].sort((a, b) => b.number - a.number);
                return sorted.find((season) => !season.ended_at) ?? sorted[0] ?? null;
            }),
            catchError(() => of(null)),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.season$.pipe(
            switchMap((season) =>
                season && userId
                    ? this.hungerGames.getPlayerSeasonStats$(season.id, userId).pipe(
                          map((stats: IPlayerSeasonStats | null) =>
                              stats
                                  ? {
                                        season: season.number,
                                        active: !season.ended_at,
                                        elo: stats.elo,
                                        wins: stats.wins,
                                        kills: stats.kills,
                                        rank: stats.rank,
                                    }
                                  : null
                          ),
                          catchError(() => of(null))
                      )
                    : of(null)
            )
        );
    }
}
