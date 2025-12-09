import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '../../services/settlement.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { UserService } from '../../services/user.service';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';
import { ISettlement } from '../interfaces/i-settlement';
import { NotificationService } from '../../services/notification.service';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { CreateSettlementFormComponent } from '@app/profile/create-settlement-from/create-settlement-from.component';
import { SettlementsTypes } from '@app/services/enums/settlements-types';
import { ISettlementInvitation } from '@app/services/interface/i-settlement-invitation';
import { getSettlementTypeByKey } from '@app/functions/get-settlement-type-by-key.function';
import { TuiPulse } from '@taiga-ui/kit';
import { IPlayer } from '@app/services/interface/i-player';
import { SettlementTagComponent } from '@app/profile/admin/moderate-settlement-request/settlement-tag/settlement-tag.component';
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
     * Сервис уведомлений.
     */
    private readonly notificationService: NotificationService = inject(NotificationService);

    /**
     * Объект обнаружения изменений.
     */
    private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * {@link Observable} Списка приглашений в селение.
     */
    protected readonly invitations$: Observable<ISettlementInvitation[]> = this.notificationService.invitations$;

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);
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
            catchError(() => {
                return of(undefined);
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
    protected getSettlementType(key: string | undefined): string {
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
            .subscribe();
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
     * Принимает приглашение в селение.
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
    protected levelUp(currentType: string): void {
        const type = this.getSettlementsTypeEnumByKey(currentType);
        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), { data: { level: type } })
            .subscribe();
    }

    protected settlementLeave(settlementId: string, userId: string): void {
        this.settlementService.settlementLeave$(settlementId, userId).subscribe();
    }

    /**
     * Возвращает именнованый тип поселения.
     *
     * @param key Ключ-типа селения.
     */
    protected getSettlementsTypeEnumByKey(key: string): SettlementsTypes {
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

    protected getTag(tagId: string) {
        return this.settlementService.getTagById(tagId);
    }
}
