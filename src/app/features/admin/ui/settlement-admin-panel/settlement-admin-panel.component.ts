import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
    Signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
    getOwnerIds,
    getSettlementDisplayName,
    ISettlement,
    SettlementService,
} from '@entities/settlement';
import { IPlayer, UserService } from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { DIPLOMACY_OPTIONS } from '../../config/diplomacy-options.constant';
import { DeleteSettlementDialogComponent } from '../delete-settlement-dialog/delete-settlement-dialog.component';

/**
 * Панель администрирования поселений.
 *
 * Позволяет искать поселение, включать и выключать систему ролей,
 * выдавать и снимать владельцев, менять дипломатию и удалять поселение.
 * Список поселений загружается один раз, поиск идёт по загруженным данным —
 * серверного поиска по поселениям в контракте нет.
 */
@Component({
    selector: 'app-settlement-admin-panel',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TuiIcon,
        TuiLoader,
        TranslatePipe,
        LHInputComponent,
        EmptyStateComponent,
    ],
    templateUrl: './settlement-admin-panel.component.html',
    styleUrl: './settlement-admin-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementAdminPanelComponent {
    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис данных о пользователях — источник игровых имён владельцев.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис уведомлений о результате запроса.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Варианты дипломатического курса.
     */
    protected readonly diplomacyOptions = DIPLOMACY_OPTIONS;

    /**
     * Поле поиска поселения по названию.
     */
    protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

    /**
     * Поле ввода игрового имени будущего владельца.
     */
    protected readonly ownerNameControl = new FormControl<string>('', { nonNullable: true });

    /**
     * Загруженные поселения.
     */
    private readonly settlements = signal<ISettlement[]>([]);

    /**
     * Идентификатор выбранного поселения.
     */
    private readonly selectedId = signal<string | null>(null);

    /**
     * Игровые имена участников выбранного поселения.
     */
    private readonly memberNames = signal<Record<string, string>>({});

    /**
     * Введённая строка поиска.
     */
    private readonly query = signal<string>('');

    /**
     * Признак загрузки списка поселений.
     */
    protected readonly loading = signal(true);

    /**
     * Признак выполняющейся операции над поселением.
     */
    protected readonly busy = signal(false);

    /**
     * Поселения, подходящие под строку поиска.
     */
    protected readonly filtered: Signal<ISettlement[]> = computed(() => {
        const query = this.query().trim().toLowerCase();
        const list = this.settlements();

        if (!query) {
            return list;
        }

        return list.filter((settlement) =>
            getSettlementDisplayName(settlement).toLowerCase().includes(query)
        );
    });

    /**
     * Выбранное поселение.
     */
    protected readonly selected: Signal<ISettlement | null> = computed(() => {
        const id = this.selectedId();

        return id ? (this.settlements().find((settlement) => settlement.id === id) ?? null) : null;
    });

    /**
     * Владельцы выбранного поселения.
     */
    protected readonly owners: Signal<{ userId: string; name: string }[]> = computed(() => {
        const settlement = this.selected();

        if (!settlement) {
            return [];
        }

        return getOwnerIds(settlement).map((userId) => ({
            userId,
            name: this.memberNames()[userId] ?? userId,
        }));
    });

    constructor() {
        this.searchControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => this.query.set(value));

        this.load();
    }

    /**
     * Возвращает отображаемое название поселения.
     *
     * @param settlement Поселение.
     * @returns Название без служебного маркера гильдии.
     */
    protected displayName(settlement: ISettlement): string {
        return getSettlementDisplayName(settlement);
    }

    /**
     * Выбирает поселение для управления.
     *
     * @param settlement Поселение.
     */
    protected select(settlement: ISettlement): void {
        this.selectedId.set(settlement.id);
        this.loadMemberNames(settlement);
    }

    /**
     * Включает или выключает систему ролей поселения.
     *
     * Ответ эндпоинта не содержит поселения, поэтому флаг обновляется локально.
     *
     * @param settlement Поселение.
     * @param enabled Целевое состояние флага.
     */
    protected setRolesEnabled(settlement: ISettlement, enabled: boolean): void {
        this.run(
            this.settlementService.adminSetRolesEnabled$(settlement.id, enabled).pipe(
                tap(() =>
                    this.patch(settlement.id, (current) => ({ ...current, roles_enabled: enabled }))
                )
            ),
            enabled ? 'admin.settlementAdmin.rolesEnabled' : 'admin.settlementAdmin.rolesDisabled',
            'admin.settlementAdmin.rolesError'
        );
    }

    /**
     * Меняет дипломатический курс поселения.
     *
     * @param settlement Поселение.
     * @param diplomacy Новый курс.
     */
    protected setDiplomacy(settlement: ISettlement, diplomacy: string): void {
        this.run(
            this.settlementService
                .adminUpdateSettlement$(settlement.id, diplomacy)
                .pipe(tap((updated) => this.patch(settlement.id, () => updated))),
            'admin.settlementAdmin.diplomacyUpdated',
            'admin.settlementAdmin.diplomacyError'
        );
    }

    /**
     * Выдаёт владение игроку, найденному по игровому имени.
     *
     * Эндпоинт принимает идентификатор пользователя, поэтому имя сначала
     * разрешается через поиск.
     *
     * @param settlement Поселение.
     */
    protected addOwner(settlement: ISettlement): void {
        const name = this.ownerNameControl.value.trim();

        if (!name) {
            return;
        }

        this.busy.set(true);

        this.settlementService
            .searchUser$(name)
            .pipe(
                catchError(() => of({ users: [] })),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((result) => {
                const user = (result.users ?? []).find(
                    (item: { user_game_name?: string }) => item.user_game_name === name
                );

                if (!user) {
                    this.busy.set(false);
                    this.requestStatus.showError(
                        this.i18n.translate('admin.settlementAdmin.ownerNotFound')
                    );

                    return;
                }

                this.busy.set(false);
                this.run(
                    this.settlementService
                        .adminAddOwner$(settlement.id, user.user_id)
                        .pipe(tap(() => this.reloadSettlement(settlement.id))),
                    'admin.settlementAdmin.ownerAdded',
                    'admin.settlementAdmin.ownerAddError'
                );
                this.ownerNameControl.setValue('');
            });
    }

    /**
     * Снимает владение с игрока.
     *
     * @param settlement Поселение.
     * @param userId Идентификатор владельца.
     */
    protected removeOwner(settlement: ISettlement, userId: string): void {
        this.run(
            this.settlementService
                .adminRemoveOwner$(settlement.id, userId)
                .pipe(tap(() => this.reloadSettlement(settlement.id))),
            'admin.settlementAdmin.ownerRemoved',
            'admin.settlementAdmin.ownerRemoveError'
        );
    }

    /**
     * Удаляет поселение после ввода его названия в диалоге подтверждения.
     *
     * Удаление необратимо и стирает приглашения и заявки, поэтому одного
     * «Да» недостаточно: кнопка активируется только при точном вводе названия.
     *
     * @param settlement Поселение.
     */
    protected deleteSettlement(settlement: ISettlement): void {
        this.dialogs
            .open<boolean>(new PolymorpheusComponent(DeleteSettlementDialogComponent), {
                size: 'auto',
                data: { name: getSettlementDisplayName(settlement) },
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.run(
                    this.settlementService.adminDeleteSettlement$(settlement.id).pipe(
                        tap(() => {
                            this.settlements.set(
                                this.settlements().filter((item) => item.id !== settlement.id)
                            );
                            this.selectedId.set(null);
                        })
                    ),
                    'admin.settlementAdmin.deleted',
                    'admin.settlementAdmin.deleteError'
                );
            });
    }

    /**
     * Загружает список поселений.
     */
    private load(): void {
        this.loading.set(true);

        this.settlementService
            .getSettlements()
            .pipe(
                catchError(() => of([] as ISettlement[])),
                finalize(() => this.loading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((list) => this.settlements.set(list ?? []));
    }

    /**
     * Перечитывает поселение после операции, не возвращающей его состав.
     *
     * @param settlementId Идентификатор поселения.
     */
    private reloadSettlement(settlementId: string): void {
        this.settlementService
            .getSettlementById(settlementId)
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((settlement) => {
                if (!settlement) {
                    return;
                }

                this.patch(settlementId, () => settlement);
                this.loadMemberNames(settlement);
            });
    }

    /**
     * Загружает игровые имена участников поселения одним батчем.
     *
     * @param settlement Поселение.
     */
    private loadMemberNames(settlement: ISettlement): void {
        this.userService
            .getPlayersBatch$((settlement.members ?? []).map((member) => member.user_id))
            .pipe(
                catchError(() => of([] as IPlayer[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) =>
                this.memberNames.set(
                    Object.fromEntries(players.map((player) => [player.user_id, player.user_game_name]))
                )
            );
    }

    /**
     * Заменяет поселение в списке результатом преобразования.
     *
     * @param settlementId Идентификатор поселения.
     * @param update Функция преобразования.
     */
    private patch(settlementId: string, update: (current: ISettlement) => ISettlement): void {
        this.settlements.set(
            this.settlements().map((item) => (item.id === settlementId ? update(item) : item))
        );
    }

    /**
     * Выполняет административную операцию с уведомлением о результате.
     *
     * @param request Запрос операции.
     * @param successKey Ключ перевода уведомления об успехе.
     * @param errorKey Ключ перевода уведомления об ошибке.
     */
    private run(request: Observable<unknown>, successKey: string, errorKey: string): void {
        this.busy.set(true);

        request
            .pipe(
                tap(() => this.requestStatus.showSuccess(this.i18n.translate(successKey))),
                catchError((error: HttpErrorResponse) => {
                    this.requestStatus.showError(
                        this.i18n.translate(
                            error.status === 400 ? 'admin.settlementAdmin.lastOwner' : errorKey
                        )
                    );

                    return of(null);
                }),
                finalize(() => this.busy.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
