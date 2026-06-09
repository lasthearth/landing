import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '@entities/settlement';
import { AsyncPipe, NgIf } from '@angular/common';
import { UserService } from '@entities/user';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';
import { ISettlement } from '@entities/settlement';
import { NotificationService } from '@core/services/notification.service';
import { BehaviorSubject, catchError, filter, forkJoin, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateSettlementFormComponent } from '@app/features/profile/create-settlement-from/create-settlement-from.component';
import { SettlementsTypes } from '@entities/settlement';
import { ISettlementInvitation } from '@entities/settlement';
import { getSettlementTypeByKey } from '@entities/settlement/lib/get-settlement-type-by-key.function';
import { TuiPulse } from '@taiga-ui/kit';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { IPlayer } from '@entities/user';
import { SettlementTagComponent } from '@app/features/admin/moderate-settlement-request/settlement-tag/settlement-tag.component';

/**
 * Компонент карточки селения.
 * Отображает информацию о поселении, членов, приглашения и управление.
 */
@Component({
    standalone: true,
    selector: 'app-settlement',
    imports: [AsyncPipe, NgIf, TuiLoader, TuiPulse, TuiIcon, SettlementTagComponent],
    templateUrl: './settlement.component.html',
    styleUrl: './settlement.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Идентификатор пользователя.
     */
    protected readonly userId: string = this.userService.userId;

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис уведомлений.
     */
    private readonly notificationService: NotificationService = inject(NotificationService);

    /**
     * Объект обнаружения изменений.
     */
    private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * {@link Observable} Списка приглашений в селение (входящие).
     */
    protected readonly invitations$: Observable<ISettlementInvitation[]> = this.notificationService.invitations$;

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * {@link Observable} Статуса заявки на создание поселения.
     */
    protected requestStatus$ = this.settlementService.getRequestSettlementStatus$(this.userId);

    /**
     * Триггер для обновления списка отправленных приглашений.
     */
    private readonly settlementId$ = new BehaviorSubject<string | null>(null);

    /**
     * {@link Observable} Информации о селении.
     */
    protected readonly settlementInfo$: Observable<ISettlement | undefined> = this.settlementService
        .getSettlementInfo(this.userService.userId)
        .pipe(
            map((settlement) => {
                if (settlement === null) return undefined;

                this.userService
                    .getPlayer$(settlement.leader.user_id)
                    .pipe(
                        tap((user) => {
                            this.leader = user;
                            this.cdr.detectChanges();
                        })
                    )
                    .subscribe();

                settlement.members.forEach((member) => {
                    this.userService
                        .getPlayer$(member.user_id)
                        .pipe(
                            tap((user) => {
                                this.users.push(user);
                                this.cdr.detectChanges();
                            })
                        )
                        .subscribe();
                });

                return settlement;
            }),
            tap((settlement) => {
                this.settlementId$.next(settlement?.id ?? null);
            }),
            catchError(() => {
                return of(undefined);
            })
        );

    /**
     * {@link Observable} Списка отправленных приглашений (только для лидера).
     */
    protected readonly sentInvitations$: Observable<ISettlementInvitation[]> = this.settlementId$.pipe(
        filter((id): id is string => !!id),
        switchMap((settlementId) => this.settlementService.getSentInvitations(settlementId))
    );

    /**
     * {@link Observable} Данных игроков для отправленных приглашений.
     */
    protected readonly sentInvitationUsers$: Observable<IPlayer[]> = this.sentInvitations$.pipe(
        switchMap((invitations) => {
            if (invitations.length === 0) {
                return of([]);
            }

            return forkJoin(invitations.map((inv) => this.userService.getPlayer$(inv.user_id)));
        })
    );

    /**
     * Список членов поселения.
     */
    protected users: IPlayer[] = [];

    /**
     * Имя лидера поселения.
     */
    protected leader!: IPlayer;

    /**
     * Открывает диалоговое окно создания поселения.
     */
    protected createSettlement(): void {
        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), {
                data: { level: SettlementsTypes.initial },
            })
            .subscribe();
    }

    /**
     * Возвращает наименования типа селения по его ключу.
     *
     * @param key Ключ-типа селения.
     */
    protected getSettlementType(key: string | number | undefined): string {
        return getSettlementTypeByKey(key);
    }

    /**
     * Открывает диалоговое окно приглашения пользователя.
     *
     * @param info Информация об селении.
     */
    protected invitePlayer(info: ISettlement): void {
        this.dialogs
            .open(new PolymorpheusComponent(PlayerInviteComponent), { data: { settlementId: info.id } })
            .subscribe({
                complete: () => {
                    this.settlementId$.next(info.id);
                },
            });
    }

    /**
     * Временная память данных о поселениях.
     */
    private settlementCache: Map<string, Observable<string>> = new Map<string, Observable<string>>();

    /**
     * Возвращает имя селения.
     *
     * @param id Идентификатор селения.
     */
    protected getSettlementName$(id: string): Observable<string> {
        if (!this.settlementCache.has(id)) {
            this.settlementCache.set(
                id,
                this.settlementService.getSettlementById(id).pipe(
                    map((data) => data.name),
                    shareReplay(1)
                )
            );
        }
        return this.settlementCache.get(id)!;
    }

    /**
     * Принимает приглашение в селение.
     *
     * @param id Идентификатор приглашения.
     */
    protected inviteAccept(id: string): void {
        this.settlementService.inviteAccept(id).subscribe();
    }

    /**
     * Отклоняет приглашение в селение.
     *
     * @param id Идентификатор приглашения.
     */
    protected rejectAccept(id: string): void {
        this.settlementService.rejectAccept(id).subscribe();
    }

    /**
     * Открывает диалоговое окно повышения уровня поселения.
     *
     * @param currentType Текущий тип поселения.
     */
    protected levelUp(currentType: string | number): void {
        const type = typeof currentType === 'number' ? currentType : this.getSettlementsTypeEnumByKey(currentType);
        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), { data: { level: type } })
            .subscribe();
    }

    /**
     * Исключает пользователя из поселения.
     *
     * Запрашивает подтверждение перед исключением.
     *
     * @param settlementId Идентификатор поселения.
     * @param targetUserId Идентификатор исключаемого пользователя.
     */
    protected settlementLeave(settlementId: string, targetUserId: string): void {
        const isSelfLeave = targetUserId === this.userId;
        const title = isSelfLeave ? 'Покинуть селение' : 'Удаление участника';
        const text = isSelfLeave
            ? 'Вы уверены, что хотите покинуть селение? Это действие нельзя отменить.'
            : 'Вы уверены, что хотите удалить этого участника из селения?';

        this.confirmDialog
            .open({ title, text })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (confirmed) => {
                    if (!confirmed) {
                        return;
                    }

                    this.settlementService.settlementLeave$(settlementId, targetUserId).subscribe({
                        next: () => {
                            if (isSelfLeave) {
                                window.location.reload();

                                return;
                            }

                            const index = this.users.findIndex((u) => u.user_id === targetUserId);

                            if (index !== -1) {
                                this.users.splice(index, 1);
                                this.cdr.detectChanges();
                            }
                        },
                    });
                },
            });
    }

    /**
     * Отзывает отправленное приглашение.
     *
     * @param settlementId Идентификатор поселения.
     * @param invitationId Идентификатор приглашения.
     */
    protected revokeInvitation(settlementId: string, invitationId: string): void {
        this.confirmDialog
            .open({
                title: 'Отмена приглашения',
                text: 'Вы уверены, что хотите отменить это приглашение?',
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (confirmed) => {
                    if (!confirmed) {
                        return;
                    }

                    this.settlementService.revokeInvitation(settlementId, invitationId).subscribe(() => {
                        this.settlementId$.next(settlementId);
                    });
                },
            });
    }

    /**
     * Возвращает именнованый тип поселения.
     *
     * @param key Ключ-типа селения.
     */
    protected getSettlementsTypeEnumByKey(key: string | number): SettlementsTypes {
        if (typeof key === 'number') {
            return key as SettlementsTypes;
        }
        switch (key) {
            case 'CAMP':
            default:
                return SettlementsTypes.camp;
            case 'VILLAGE':
                return SettlementsTypes.village;
            case 'TOWNSHIP':
                return SettlementsTypes.township;
            case 'CITY':
                return SettlementsTypes.city;
            case 'PROVINCE':
                return SettlementsTypes.region;
        }
    }

    /**
     * Возвращает тег по идентификатору.
     *
     * @param tagId Идентификатор тега.
     */
    protected getTag(tagId: string) {
        return this.settlementService.getTagById(tagId);
    }
}
