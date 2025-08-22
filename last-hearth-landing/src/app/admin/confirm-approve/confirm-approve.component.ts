import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { TuiAlertService, TuiDialogContext } from '@taiga-ui/core';
import { ServerInformationService } from '../../services/server-information.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, tap, throwError } from 'rxjs';
import { SettlementService } from '../../services/settlement.service';

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
    protected readonly context: TuiDialogContext<void, { userId: string, isSettlement: boolean }> = inject<TuiDialogContext<void, { userId: string, isSettlement: boolean }>>(POLYMORPHEUS_CONTEXT);

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
    private readonly alertService: TuiAlertService = inject(TuiAlertService);

    /**
     * Подтверждает одобрение анкеты.
     */
    protected confirmApprove(): void {
        if (this.context.data.isSettlement) {
            this.settlementService.postVerifySettlementApprove(this.context.data.userId).pipe(
                catchError((error) => {
                    this.alertService
                        .open('', { label: 'Произошла непредвиденная ошибка.', appearance: 'negative', })
                        .subscribe();
                    return throwError(() => error)
                }),
                tap(() => {
                    this.alertService
                        .open('', { label: 'Анкета одобрена!', appearance: 'positive', })
                        .subscribe();
                    this.context.$implicit.complete();
                }),
                takeUntilDestroyed(this.destroyRef))
                .subscribe();
        }
        else {
            this.serverInfoService.postVerifySuccess(this.context.data.userId).pipe(
                catchError((error) => {
                    this.alertService
                        .open('', { label: 'Произошла непредвиденная ошибка.', appearance: 'negative', })
                        .subscribe();
                    return throwError(() => error)
                }),
                tap(() => {
                    this.alertService
                        .open('', { label: 'Анкета одобрена!', appearance: 'positive', })
                        .subscribe();
                    this.context.$implicit.complete();
                }),
                takeUntilDestroyed(this.destroyRef))
                .subscribe();
        }
    }
}
