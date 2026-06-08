import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe, NgIf } from '@angular/common';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { SettlementService } from '@entities/settlement';
import { DonateService, ITransaction } from '@entities/donate';
import { UserService } from '@entities/user';
import { RequestStatusService } from '@core/services/request-status.service';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ISelectedPlayer } from '../../model/selected-player.model';

/**
 * Компонент панели управления донат-валютой в админке.
 *
 * Предоставляет интерфейс для поиска игрока, начисления и списания
 * валюты, а также просмотра истории транзакций выбранного игрока.
 */
@Component({
    selector: 'app-admin-coin-panel',
    standalone: true,
    imports: [ReactiveFormsModule, AsyncPipe, NgIf, TuiAvatar, TuiButton, TuiIcon, TuiLoader, LHInputComponent],
    templateUrl: './admin-coin-panel.component.html',
    styleUrl: './admin-coin-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCoinPanelComponent {
    /**
     * Сервис поселений для поиска пользователей.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис донат-валюты.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис статуса запросов для уведомлений.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService = inject(UserService);

    /**
     * Поле управления поиском игрока.
     */
    protected readonly searchControl = new FormControl('', { nonNullable: true });

    /**
     * Поле управления суммой операции.
     */
    protected readonly amountControl = new FormControl<string>('', {
        validators: [Validators.required, Validators.pattern(/^[1-9]\d*$/)],
    });

    /**
     * Поле управления комментарием к операции.
     */
    protected readonly commentControl = new FormControl('');

    /**
     * Выбранный игрок для операции.
     */
    protected readonly selectedPlayer = signal<ISelectedPlayer | null>(null);

    /**
     * Список транзакций выбранного игрока.
     */
    protected readonly transactions = signal<ITransaction[]>([]);

    /**
     * Признак выполнения запроса.
     */
    protected readonly isLoading = signal(false);

    /**
     * Поток результатов поиска игрока по нику.
     *
     * Срабатывает при вводе от 2 символов с debounce 300мс.
     */
    protected readonly searchResults$ = this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((term): term is string => term.length >= 2),
        switchMap((term) =>
            this.settlementService.searchUser$(term).pipe(catchError(() => of({ users: [] })))
        )
    );

    /**
     * Выбирает игрока из списка поиска.
     *
     * @param user Объект пользователя из API.
     */
    protected selectPlayer(user: any): void {
        this.selectedPlayer.set({
            playerId: user.user_id,
            playerName: user.user_game_name,
            avatar: user.avatar?.original,
        });
        this.searchControl.setValue('');
        this.loadTransactions(user.user_id);
    }

    /**
     * Сбрасывает выбранного игрока и очищает форму.
     */
    protected clearPlayer(): void {
        this.selectedPlayer.set(null);
        this.transactions.set([]);
        this.amountControl.reset('');
    }

    /**
     * Загружает историю транзакций игрока.
     *
     * @param playerId Идентификатор игрока.
     */
    private loadTransactions(playerId: string): void {
        this.donateService
            .getPlayerTransactions$(playerId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                const sorted = [...data].sort((a, b) => {
                    if (!a.createdAt || !b.createdAt) {
                        return 0;
                    }

                    return b.createdAt.getTime() - a.createdAt.getTime();
                });

                this.transactions.set(sorted);
            });
    }

    /**
     * Начисляет донат-валюту выбранному игроку.
     */
    protected addCoins(): void {
        this.performOperation('add');
    }

    /**
     * Списывает донат-валюту у выбранного игрока.
     */
    protected deductCoins(): void {
        this.performOperation('deduct');
    }

    /**
     * Выполняет операцию с валютой.
     *
     * @param type Тип операции: 'add' или 'deduct'.
     */
    private performOperation(type: 'add' | 'deduct'): void {
        const player = this.selectedPlayer();
        const amount = this.amountControl.value;

        if (!player || !amount || this.amountControl.invalid) {
            return;
        }

        this.isLoading.set(true);

        const rawComment = this.commentControl.value?.trim() ?? '';
        const adminName = this.userService.userName;
        const comment = rawComment ? `${rawComment} [${adminName}]` : `[${adminName}]`;

        const request$ =
            type === 'add'
                ? this.donateService.addCoins$(player.playerId, amount, player.playerName, comment)
                : this.donateService.deductCoins$(player.playerId, amount, comment);

        request$
            .pipe(
                this.requestStatus.handleError(),
                this.requestStatus.handleSuccess(
                    type === 'add'
                        ? `Начислено ${amount} монет игроку ${player.playerName}`
                        : `Списано ${amount} монет у игрока ${player.playerName}`
                ),
                tap(() => {
                    this.amountControl.reset('');
                    this.commentControl.reset('');
                    this.loadTransactions(player.playerId);
                }),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.isLoading.set(false));
    }

    /**
     * Форматирует тип транзакции в человекочитаемый вид.
     *
     * @param type Тип транзакции из API.
     * @returns Локализованная строка.
     */
    protected formatTransactionType(type: string): string {
        const upper = type.toUpperCase();
        switch (upper) {
            case 'CREDIT':
                return 'Зачисление';
            case 'DEBIT':
                return 'Списание';
            default:
                return type;
        }
    }
}
