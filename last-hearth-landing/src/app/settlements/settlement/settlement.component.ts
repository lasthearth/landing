import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { TuiDialogService, TuiLoader } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '../../services/settlement.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { UserService } from '../../services/user.service';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';
import { SettlementCardComponent } from '../settlement-card/settlement-card.component';
import { ISettlement } from '../interfaces/i-settlement';
import { NotificationService } from '../../services/notification.service';
import { catchError, map, mergeMap, Observable, of, share, shareReplay, Subject, switchMap, tap } from 'rxjs';
import { CreateSettlementFormComponent } from '@app/profile/create-settlement-from/create-settlement-from.component';

@Component({
    standalone: true,
    selector: 'app-settlement',
    imports: [AsyncPipe, NgIf, TuiLoader],
    templateUrl: './settlement.component.html',
    styleUrl: './settlement.component.css',
})
export class SettlementComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    private readonly addUserName$ = new Subject<string>();

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    protected userId = this.userService.userId;

    private readonly notificationService = inject(NotificationService);

    cdr = inject(ChangeDetectorRef);
    protected readonly notifications$ = this.notificationService.invitations$;

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    protected readonly settlementInfo = this.settlementService.getSettlementInfo(this.userService.userId).pipe(
        map((i) => {
            if (i === null) return undefined;
            this.userService
                .getPlayer$(i.leader.user_id)
                .pipe(
                    tap((u) => {
                        this.leader = u.user_game_name;
                        this.cdr.detectChanges();
                    })
                )
                .subscribe();

            i.members.forEach((m) => {
                this.userService
                    .getPlayer$(m.user_id)
                    .pipe(
                        tap((u) => {
                            this.users.push(u.user_game_name);
                            this.cdr.detectChanges();
                        })
                    )
                    .subscribe();
            });

            return i;
        }),
        catchError(() => {
            return of(undefined);
        })
    );

    protected users: string[] = [];

    protected leader!: string;

    protected createSettlement(): void {
        this.dialogs.open(new PolymorpheusComponent(CreateSettlementFormComponent)).subscribe();
    }

    protected getSettlementTypeByKey(key: string | undefined) {
        switch (key) {
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }

    protected invitePlayer(info: ISettlement): void {
        this.dialogs
            .open(new PolymorpheusComponent(PlayerInviteComponent), { data: { settlementId: info.id } })
            .subscribe();
    }

    private settlementCache = new Map<string, Observable<string>>();

    protected getSettlementName(id: string): Observable<string> {
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

    protected inviteAccept(id: string) {
        this.settlementService.inviteAccept(id).subscribe();
    }

    protected getPlayerName(userId: string) {}
}
