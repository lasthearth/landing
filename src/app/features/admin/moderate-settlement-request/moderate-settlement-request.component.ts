import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RequestStatusService } from '@core/services/request-status.service';
import { SettlementService } from '@entities/settlement';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Tag } from './interfaces/tag.interface';

@Component({
    selector: 'app-moderate-settlement-request',
    imports: [],
    templateUrl: './moderate-settlement-request.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
})
export class ModerateSettlementRequestComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, { userId: string }> =
        inject<TuiDialogContext<void, { userId: string }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

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
        this.settlementService
            .postVerifySettlementApprove(this.context.data.userId)
            .pipe(
                this.requestStatusService.handleError(),
                this.requestStatusService.handleSuccess('Анкета одобрена!', this.context.$implicit),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
