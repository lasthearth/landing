import { ChangeDetectorRef, Component, inject, input, InputSignal, OnInit } from '@angular/core';
import { ISettlement } from '../interfaces/i-settlement';
import { SettlementService } from '../../services/settlement.service';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';
import { CommonModule } from '@angular/common';
import { UserService } from '@app/services/user.service';
import { tap } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    styleUrls: ['./settlement-card.component.css'],
    imports: [CommonModule],
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

    protected leader!: string;

    cdr = inject(ChangeDetectorRef);

    protected users: string[] = [];

    /**
     *
     */
    ngOnInit() {
        this.userService.getPlayer$(this.data().leader.user_id).pipe(
            tap((u) => {
                this.leader = u.user_game_name;
                this.cdr.detectChanges();
            })
        ).subscribe()

        this.data().members.forEach((m) => {
            this.userService.getPlayer$(m.user_id).pipe(
                tap((u) => {
                    this.users.push(u.user_game_name);
                    this.cdr.detectChanges();
                })
            ).subscribe()
        });
    }

    protected getSettlementTypeByKey(key: string | undefined) {
        switch (key) {
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }
}
