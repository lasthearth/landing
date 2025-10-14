import { Component, inject } from '@angular/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '../../services/settlement.service';
import { LInputComponent } from '../../components/l-input/l-input.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { TuiAvatar } from '@taiga-ui/kit';
import { ISettlement } from '../interfaces/i-settlement';

@Component({
    standalone: true,
    selector: 'app-player-invite',
    imports: [LInputComponent, AsyncPipe, ReactiveFormsModule, NgIf, TuiAvatar],
    templateUrl: './player-invite.component.html',
    styleUrls: ['./player-invite.component.css']
})
export class PlayerInviteComponent {
    protected playerNickControl = new FormControl();

    /**
         * Контекст открытого диалогового окна.
         */
    protected readonly context: TuiDialogContext<void, { settlementId: string }> = inject<TuiDialogContext<void, { settlementId: string }>>(POLYMORPHEUS_CONTEXT);

    protected readonly players$ = this.playerNickControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
            if (term === '') {
                return of({ users: [] })
            }
            else {
                return this.settlementService.searchUser$(term)
            }
        }
        )
    );

    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);


    /**
     * Открывает диалог создания вопроса.
     */
    protected openCreateQuestionDialog(): void {
        this.dialogs.open(new PolymorpheusComponent(PlayerInviteComponent)).subscribe();
    }

    protected playerInvite(userId: string) {
        debugger;
        this.settlementService.invitePlayer(this.context.data.settlementId, userId).subscribe();
    }

}
