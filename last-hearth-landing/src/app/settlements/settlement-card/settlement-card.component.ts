import { ChangeDetectorRef, Component, inject, input, InputSignal, OnInit } from '@angular/core';
import { ISettlement } from '../interfaces/i-settlement';
import { SettlementService } from '../../services/settlement.service';
import { TuiDialogService } from '@taiga-ui/core';
import { CommonModule } from '@angular/common';
import { UserService } from '@app/services/user.service';
import { tap } from 'rxjs';
import { TuiPulse } from '@taiga-ui/kit';
import { IPlayer } from '@app/services/interface/i-player';
import { getSettlementTypeByKey } from '@app/functions/get-settlement-type-by-key.function';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    imports: [CommonModule, TuiPulse],
})
export class SettlementCardComponent implements OnInit {
    /**
     * Данные поселения.
     */
    public data: InputSignal<ISettlement> = input.required();

    public isControlCard: InputSignal<boolean> = input(false);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    protected leader!: IPlayer;

    cdr = inject(ChangeDetectorRef);

    protected users: IPlayer[] = [];

    /**
     *
     */
    ngOnInit() {
        this.userService
            .getPlayer$(this.data().leader.user_id)
            .pipe(
                tap((u) => {
                    this.leader = u;
                    this.cdr.detectChanges();
                })
            )
            .subscribe();

        this.data().members.forEach((m) => {
            this.userService
                .getPlayer$(m.user_id)
                .pipe(
                    tap((u) => {
                        this.users.push(u);
                        this.cdr.detectChanges();
                    })
                )
                .subscribe();
        });
    }

    protected getSettlementTypeByKey(key: string | undefined) {
        return getSettlementTypeByKey(key);
    }
}
