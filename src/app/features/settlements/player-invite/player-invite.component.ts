import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SettlementService } from '@entities/settlement';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { resolveAvatarUrl } from '@shared/lib/resolve-avatar-url';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';

@Component({
    standalone: true,
    selector: 'app-player-invite',
    imports: [LHInputComponent, AsyncPipe, ReactiveFormsModule, ImageLoaderComponent, EmptyStateComponent, TranslatePipe],
    templateUrl: './player-invite.component.html',
    styleUrl: './player-invite.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerInviteComponent {
    protected playerNickControl = new FormControl();

    /**
     * Хелпер для получения URL аватара из разных форматов API.
     */
    protected readonly resolveAvatarUrl = resolveAvatarUrl;

    private readonly destroyRef$ = inject(DestroyRef);

    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Идентификатор пользователя.
     */
    protected readonly userId: string = inject(UserService).userId;

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

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
            this.requestStatus.showError(this.i18n.translate('settlements.invite.selfError'));
            return;
        }
        this.settlementService
            .invitePlayer(this.context.data.settlementId, userId)
            .pipe(
                this.requestStatus.handleError(),
                this.requestStatus.handleSuccess(this.i18n.translate('settlements.invite.success'), this.context.$implicit),
                takeUntilDestroyed(this.destroyRef$)
            )
            .subscribe();
    }
}
