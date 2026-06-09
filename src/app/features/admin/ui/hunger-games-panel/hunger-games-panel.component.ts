import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, finalize, of, tap } from 'rxjs';

import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { RequestStatusService } from '@core/services/request-status.service';
import { SettlementService } from '@entities/settlement';
import {
    HungerGamesService,
    ILeaderboardEntry,
    IMatchPlayer,
    ISeasonInfo,
    ISeasonResultEntry,
} from '@entities/hunger-games';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ISeasonOption } from './model/season-option.model';


/**
 * Компонент панели управления Hunger Games в админке.
 *
 * Предоставляет интерфейс для управления сезонами, записи результатов матчей,
 * просмотра лидербордов и распределения наград.
 */
@Component({
    selector: 'app-hunger-games-panel',
    standalone: true,
    imports: [ReactiveFormsModule, TuiAvatar, TuiIcon, TuiLoader, LHInputComponent],
    templateUrl: './hunger-games-panel.component.html',
    styleUrl: './hunger-games-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HungerGamesPanelComponent implements OnInit {
    /**
     * Сервис Hunger Games.
     */
    private readonly hungerGamesService = inject(HungerGamesService);

    /**
     * Сервис поселений для поиска пользователей.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис обработки статуса запросов.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Текущий активный сезон.
     */
    protected readonly currentSeason = signal<ISeasonInfo | null>(null);

    /**
     * Список всех сезонов.
     */
    protected readonly seasons = signal<ISeasonInfo[]>([]);

    /**
     * Лидерборд текущего активного сезона.
     */
    protected readonly currentLeaderboard = signal<ILeaderboardEntry[]>([]);

    /**
     * Лидерборд выбранного архивного сезона.
     */
    protected readonly archiveLeaderboard = signal<ISeasonResultEntry[]>([]);

    /**
     * Идентификатор выбранного сезона для просмотра истории лидерборда.
     */
    protected readonly selectedSeasonId = signal<string>('');

    /**
     * Опции выбора сезона для дропдауна лидерборда.
     *
     * Первый элемент — "Текущий сезон" с пустым идентификатором.
     */
    protected readonly seasonOptions = computed<ISeasonOption[]>(() => [
        { id: '', label: 'Текущий сезон' },
        ...this.seasons().map((season) => ({
            id: season.id,
            label: `Сезон ${season.number}`,
        })),
    ]);

    /**
     * Поле управления выбором сезона для лидерборда.
     */
    protected readonly seasonSelectControl = new FormControl<ISeasonOption | null>(
        { id: '', label: 'Текущий сезон' },
        { nonNullable: false }
    );

    /**
     * Признак выполнения запроса.
     */
    protected readonly isLoading = signal(false);

    /**
     * Признак выполнения запроса создания/сброса сезона.
     */
    protected readonly isSeasonActionLoading = signal(false);

    /**
     * Признак выполнения запроса записи матча.
     */
    protected readonly isMatchLoading = signal(false);

    /**
     * Список участников записываемого матча.
     */
    protected readonly matchPlayers = signal<IMatchPlayer[]>([]);

    /**
     * Сообщение об ошибке валидации матча.
     */
    protected readonly matchValidationError = signal<string>('');

    /**
     * Поле управления поиском игрока для добавления в матч.
     */
    protected readonly searchControl = new FormControl('', { nonNullable: true });

    /**
     * Результаты поиска игрока для добавления в матч.
     */
    protected readonly searchResults = signal<any[]>([]);

    /**
     * Список наград для распределения при сбросе сезона.
     */
    protected readonly seasonRewards = signal<{ rank: number; coins: string }[]>([
        { rank: 1, coins: '' },
        { rank: 2, coins: '' },
        { rank: 3, coins: '' },
    ]);

    /**
     * Ошибка валидации наград.
     */
    protected readonly rewardsValidationError = signal<string>('');

    /**
     * Инициализирует компонент и загружает начальные данные.
     */
    public ngOnInit(): void {
        this.loadCurrentSeason();
        this.loadSeasons();
        this.loadLeaderboard();

        this.searchControl.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                filter((term): term is string => term.length >= 2),
                switchMap((term) =>
                    this.settlementService.searchUser$(term).pipe(catchError(() => of({ users: [] })))
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((result) => {
                this.searchResults.set(result.users);
            });

        this.seasonSelectControl.valueChanges
            .pipe(
                filter((option): option is ISeasonOption => option !== null),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((option) => {
                this.selectedSeasonId.set(option.id);
                this.loadLeaderboard();
            });
    }

    /**
     * Загружает информацию о текущем сезоне.
     */
    private loadCurrentSeason(): void {
        this.isLoading.set(true);
        this.hungerGamesService
            .getCurrentSeason$()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.isLoading.set(false))
            )
            .subscribe((season) => {
                this.currentSeason.set(season);
            });
    }

    /**
     * Загружает историю сезонов.
     */
    private loadSeasons(): void {
        this.hungerGamesService
            .getSeasons$()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                catchError(() => of([]))
            )
            .subscribe((list) => {
                this.seasons.set(list);
            });
    }

    /**
     * Загружает лидерборд.
     *
     * Если выбран конкретный сезон — загружает его архивный лидерборд,
     * иначе — текущий активный.
     */
    protected loadLeaderboard(): void {
        const seasonId = this.selectedSeasonId();

        if (seasonId) {
            this.currentLeaderboard.set([]);
            this.hungerGamesService
                .getSeasonLeaderboard$(seasonId)
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    catchError(() => of([]))
                )
                .subscribe((list) => {
                    this.archiveLeaderboard.set(list);
                });
        } else {
            this.archiveLeaderboard.set([]);
            this.hungerGamesService
                .getLeaderboard$()
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    catchError(() => of([]))
                )
                .subscribe((list) => {
                    this.currentLeaderboard.set(list);
                });
        }
    }

    /**
     * Форматирует опцию сезона для отображения в дропдауне.
     *
     * @param option Опция сезона.
     * @returns Отображаемый текст.
     */
    protected displaySeason(option: ISeasonOption): string {
        return option.label;
    }

    /**
     * Создаёт новый сезон после подтверждения.
     */
    protected createSeason(): void {
        this.confirmDialog
            .open({
                title: 'Создать новый сезон?',
                text: 'Текущий активный сезон будет завершён, если он есть. Продолжить?',
            })
            .pipe(
                filter((confirmed) => confirmed),
                tap(() => this.isSeasonActionLoading.set(true)),
                switchMap(() =>
                    this.hungerGamesService
                        .createSeason$()
                        .pipe(this.requestStatus.handleError(), this.requestStatus.handleSuccess('Новый сезон создан'))
                ),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.isSeasonActionLoading.set(false);
                this.loadCurrentSeason();
                this.loadSeasons();
                this.loadLeaderboard();
            });
    }

    /**
     * Проверяет корректность списка наград.
     *
     * @returns `true`, если награды валидны.
     */
    private validateRewards(): boolean {
        const rewards = this.seasonRewards();

        if (rewards.length === 0) {
            this.rewardsValidationError.set('Добавьте хотя бы одну награду');
            return false;
        }

        const validRewards = rewards.filter((r) => r.coins.trim() !== '');

        if (validRewards.length === 0) {
            this.rewardsValidationError.set('Укажите сумму хотя бы для одной награды');
            return false;
        }

        const ranks = validRewards.map((r) => r.rank);
        const uniqueRanks = new Set(ranks);

        if (uniqueRanks.size !== ranks.length) {
            this.rewardsValidationError.set('Места наград не должны повторяться');
            return false;
        }

        if (validRewards.some((r) => r.rank <= 0)) {
            this.rewardsValidationError.set('Место должно быть положительным числом');
            return false;
        }

        if (validRewards.some((r) => Number(r.coins) < 0)) {
            this.rewardsValidationError.set('Сумма награды не может быть отрицательной');
            return false;
        }

        this.rewardsValidationError.set('');
        return true;
    }

    /**
     * Сбрасывает текущий сезон после подтверждения, распределяя награды.
     */
    protected resetSeason(): void {
        if (!this.validateRewards()) {
            return;
        }

        const rewards = this.seasonRewards().filter((r) => r.coins.trim() !== '');

        this.confirmDialog
            .open({
                title: 'Сбросить текущий сезон?',
                text: `Будет распределено ${rewards.length} наград. Это действие нельзя отменить.`,
            })
            .pipe(
                filter((confirmed) => confirmed),
                tap(() => this.isSeasonActionLoading.set(true)),
                switchMap(() =>
                    this.hungerGamesService
                        .resetSeason$(rewards)
                        .pipe(this.requestStatus.handleError(), this.requestStatus.handleSuccess('Сезон завершён и награды распределены'))
                ),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.isSeasonActionLoading.set(false);
                this.loadCurrentSeason();
                this.loadSeasons();
                this.loadLeaderboard();
            });
    }

    /**
     * Добавляет новую награду в список.
     */
    protected addReward(): void {
        this.seasonRewards.update((rewards) => [
            ...rewards,
            { rank: rewards.length + 1, coins: '' },
        ]);
        this.rewardsValidationError.set('');
    }

    /**
     * Удаляет награду из списка.
     *
     * @param index Индекс награды.
     */
    protected removeReward(index: number): void {
        this.seasonRewards.update((rewards) => rewards.filter((_, i) => i !== index));
        this.rewardsValidationError.set('');
    }

    /**
     * Обновляет место награды.
     *
     * @param index Индекс награды.
     * @param value Новое значение места.
     */
    protected updateRewardRank(index: number, value: string): void {
        const rank = parseInt(value, 10);

        this.seasonRewards.update((rewards) => {
            const updated = [...rewards];
            updated[index] = { ...updated[index], rank: isNaN(rank) ? 0 : rank };
            return updated;
        });
    }

    /**
     * Обновляет сумму награды.
     *
     * @param index Индекс награды.
     * @param value Новая сумма.
     */
    protected updateRewardCoins(index: number, value: string): void {
        this.seasonRewards.update((rewards) => {
            const updated = [...rewards];
            updated[index] = { ...updated[index], coins: value };
            return updated;
        });
    }

    /**
     * Добавляет выбранного игрока в список участников матча.
     *
     * @param user Объект пользователя из API.
     */
    protected addPlayer(user: any): void {
        const userId = user.user_id as string;
        const exists = this.matchPlayers().some((p) => p.playerId === userId);

        if (exists) {
            this.matchValidationError.set('Игрок уже добавлен в матч');
            return;
        }

        this.matchPlayers.update((players) => [
            ...players,
            {
                playerId: userId,
                playerName: user.user_game_name as string,
                place: players.length + 1,
                kills: 0,
            },
        ]);
        this.matchValidationError.set('');
        this.searchControl.setValue('');
        this.searchResults.set([]);
    }

    /**
     * Удаляет игрока из списка участников матча.
     *
     * @param index Индекс игрока в списке.
     */
    protected removePlayer(index: number): void {
        this.matchPlayers.update((players) => players.filter((_, i) => i !== index));
        this.matchValidationError.set('');
    }

    /**
     * Обновляет место игрока в матче.
     *
     * @param index Индекс игрока.
     * @param value Новое значение места.
     */
    protected updatePlace(index: number, value: string): void {
        const place = parseInt(value, 10);

        this.matchPlayers.update((players) => {
            const updated = [...players];
            updated[index] = { ...updated[index], place: isNaN(place) ? 0 : place };
            return updated;
        });
    }

    /**
     * Обновляет количество убийств игрока в матче.
     *
     * @param index Индекс игрока.
     * @param value Новое значение убийств.
     */
    protected updateKills(index: number, value: string): void {
        const kills = parseInt(value, 10);

        this.matchPlayers.update((players) => {
            const updated = [...players];
            updated[index] = { ...updated[index], kills: isNaN(kills) ? 0 : kills };
            return updated;
        });
    }

    /**
     * Проверяет корректность данных матча.
     *
     * @returns `true`, если данные валидны.
     */
    private validateMatch(): boolean {
        const players = this.matchPlayers();

        if (players.length < 2) {
            this.matchValidationError.set('Добавьте минимум 2 игрока');
            return false;
        }

        const places = players.map((p) => p.place);
        const uniquePlaces = new Set(places);

        if (uniquePlaces.size !== places.length) {
            this.matchValidationError.set('Места участников не должны повторяться');
            return false;
        }

        if (places.some((p) => p <= 0)) {
            this.matchValidationError.set('Место должно быть положительным числом');
            return false;
        }

        if (players.some((p) => p.kills < 0)) {
            this.matchValidationError.set('Количество убийств не может быть отрицательным');
            return false;
        }

        this.matchValidationError.set('');
        return true;
    }

    /**
     * Отправляет результат матча на сервер.
     */
    protected recordMatch(): void {
        if (!this.validateMatch()) {
            return;
        }

        this.isMatchLoading.set(true);
        this.hungerGamesService
            .recordMatch$(this.matchPlayers())
            .pipe(
                this.requestStatus.handleError(),
                this.requestStatus.handleSuccess('Результат матча записан'),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.isMatchLoading.set(false);
                this.matchPlayers.set([]);
                this.loadLeaderboard();
            });
    }
}
