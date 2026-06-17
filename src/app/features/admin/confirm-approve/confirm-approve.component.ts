import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VerificationService } from '@features/verification';
import { SettlementService } from '@entities/settlement';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';

/**
 * Компонент подтверждения одобрения.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-approve',
    templateUrl: './confirm-approve.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TuiIcon, TranslatePipe],
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
    private readonly verificationService: VerificationService = inject(VerificationService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Подтверждает одобрение анкеты.
     */
    protected confirmApprove(): void {
        switch (this.context.data.type) {
            case 'settlement': {
                this.settlementService.postVerifySettlementApprove(this.context.data.userId).pipe(
                    this.requestStatusService.handleError(),
                    this.requestStatusService.handleSuccess(this.i18n.translate('admin.verification.approveSuccess'), this.context.$implicit),
                    takeUntilDestroyed(this.destroyRef))
                    .subscribe();

                break;
            }
            case 'user': {
                this.verificationService.postVerifySuccess(this.context.data.userId).pipe(
                    this.requestStatusService.handleError(),
                    this.requestStatusService.handleSuccess(this.i18n.translate('admin.verification.approveSuccess'), this.context.$implicit),
                    takeUntilDestroyed(this.destroyRef))
                    .subscribe();
                break;
            }
        }
    }
}
