import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerInformationService } from '@services/server-information.service';
import { SettlementService } from '@services/settlement.service';
import { RequestStatusService } from '@app/services/request-status.service';

/**
 * Компонент подтверждения одобрения.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-approve',
    templateUrl: './confirm-approve.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmApproveComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, { userId: string, type: 'settlement' | 'user' }> = inject<TuiDialogContext<void, { userId: string, type: 'settlement' | 'user' }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfoService: ServerInformationService = inject(ServerInformationService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Подтверждает одобрение анкеты.
     */
    protected confirmApprove(): void {
        switch (this.context.data.type) {
            case 'settlement': {
                this.settlementService.postVerifySettlementApprove(this.context.data.userId).pipe(
                    this.requestStatusService.handleError(),
                    this.requestStatusService.handleSuccess('Анкета одобрена!', this.context.$implicit),
                    takeUntilDestroyed(this.destroyRef))
                    .subscribe();

                break;
            }
            case 'user': {
                this.serverInfoService.postVerifySuccess(this.context.data.userId).pipe(
                    this.requestStatusService.handleError(),
                    this.requestStatusService.handleSuccess('Анкета одобрена!', this.context.$implicit),
                    takeUntilDestroyed(this.destroyRef))
                    .subscribe();
                break;
            }
        }
    }
}
