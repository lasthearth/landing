import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, Observable, of, switchMap } from 'rxjs';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';

import { IPlayer, UserService } from '@entities/user';
import { SettlementService } from '@entities/settlement';
import { TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { resolveAvatarUrl } from '@shared/lib/resolve-avatar-url';
import { ISearchedUser } from '../../model/searched-user.model';
import { PlayerNicknameAdminComponent } from '../player-nickname-admin/player-nickname-admin.component';

/**
 * Панель управления игроками в админке.
 *
 * Поиск игрока по нику и карточка игрока: данные берутся из
 * `GET /users/{user_id}`, в карточке — блок «Никнейм» с административными
 * операциями (принудительная смена ника и досрочное разрешение смены).
 */
@Component({
    standalone: true,
    selector: 'app-admin-players-panel',
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        TuiIcon,
        TuiLoader,
        TranslatePipe,
        LHInputComponent,
        ImageLoaderComponent,
        EmptyStateComponent,
        PlayerNicknameAdminComponent,
    ],
    templateUrl: './admin-players-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlayersPanelComponent {
    /**
     * Сервис поселений: от него поиск пользователей (`GET /users/search`).
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис пользователя: полная карточка игрока (`GET /users/{user_id}`).
     */
    private readonly userService = inject(UserService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Поле поиска игрока по нику.
     */
    protected readonly searchControl = new FormControl('', { nonNullable: true });

    /**
     * Идентификатор выбранного игрока.
     */
    protected readonly selectedId = signal<string | null>(null);

    /**
     * Полные данные выбранного игрока.
     */
    protected readonly player = signal<IPlayer | null>(null);

    /**
     * Признак загрузки данных выбранного игрока.
     */
    protected readonly isLoadingPlayer = signal(false);

    /**
     * Хелпер получения URL аватара из разных форматов API.
     */
    protected readonly resolveAvatarUrl = resolveAvatarUrl;

    /**
     * Поток результатов поиска игрока по нику.
     *
     * Срабатывает при вводе от 2 символов с debounce 300 мс;
     * ошибку поиска панель не показывает — список остаётся пустым.
     */
    protected readonly searchResults$: Observable<ISearchedUser[]> = this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((term): term is string => term.length >= 2),
        switchMap((term) => this.settlementService.searchUser$(term).pipe(catchError(() => of({ users: [] })))),
        map((response) => (response.users ?? []) as ISearchedUser[])
    );

    /**
     * Выбирает игрока из списка поиска и загружает его карточку.
     *
     * @param user Пользователь из выдачи поиска.
     */
    protected selectPlayer(user: ISearchedUser): void {
        this.searchControl.setValue('');
        this.selectedId.set(user.user_id);
        this.player.set(null);
        this.loadPlayer(user.user_id);
    }

    /**
     * Сбрасывает выбранного игрока и возвращает панель к поиску.
     */
    protected clearPlayer(): void {
        this.selectedId.set(null);
        this.player.set(null);
    }

    /**
     * Перечитывает данные выбранного игрока после успешной операции.
     */
    protected reloadPlayer(): void {
        const id = this.selectedId();

        if (id) {
            this.loadPlayer(id);
        }
    }

    /**
     * Загружает данные игрока по идентификатору.
     *
     * Ошибку `GET` показывает `errorInterceptor`, поэтому отдельного
     * обработчика ошибки здесь нет.
     *
     * @param userId Идентификатор игрока.
     */
    private loadPlayer(userId: string): void {
        this.isLoadingPlayer.set(true);
        this.userService
            .getPlayer$(userId)
            .pipe(finalize(() => this.isLoadingPlayer.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe((player) => this.player.set(player));
    }
}
