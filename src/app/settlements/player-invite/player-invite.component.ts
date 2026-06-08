import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { TuiDialogContext, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '../../services/settlement.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { TuiAvatar } from '@taiga-ui/kit';
import { LHInputComponent } from '@app/components/lh-input/lh-input.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@app/services/user.service';
import { RequestStatusService } from '@app/services/request-status.service';

@Component({
    standalone: true,
    selector: 'app-player-invite',
    imports: [LHInputComponent, AsyncPipe, ReactiveFormsModule, NgIf, TuiAvatar, TuiIcon],
    templateUrl: './player-invite.component.html',
    styleUrl: './player-invite.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerInviteComponent {
    protected playerNickControl = new FormControl();

    private readonly destroyRef$ = inject(DestroyRef);

    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Идентификатор пользователя.
     */
    protected readonly userId: string = inject(UserService).userId;

    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, { settlementId: string }> =
        inject<TuiDialogContext<void, { settlementId: string }>>(POLYMORPHEUS_CONTEXT);

    protected readonly players$ = this.playerNickControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
            if (term === '') {
                return of({ users: [] });
            } else {
                return this.settlementService.searchUser$(term);
            }
        })
    );

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    protected playerInvite(userId: string) {
        if (userId === this.userId) {
            this.requestStatus.showError('Нельзя пригласить себя!');
            return;
        }
        this.settlementService
            .invitePlayer(this.context.data.settlementId, userId)
            .pipe(
                this.requestStatus.handleError(),
                this.requestStatus.handleSuccess('Игрок приглашен!', this.context.$implicit),
                takeUntilDestroyed(this.destroyRef$)
            )
            .subscribe();
    }
}
