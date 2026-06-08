import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiTextarea } from '@taiga-ui/kit';
import { TuiTextareaModule, TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { Subject, filter, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerInformationService } from '@services/server-information.service';
import { SettlementService } from '@services/settlement.service';
import { RequestStatusService } from '@app/services/request-status.service';

/**
 * Компонент подтверждения отклонения.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-reject',
    imports: [TuiError, ReactiveFormsModule, FormsModule, TuiTextareaModule, TuiInputModule, TuiFieldErrorPipe, AsyncPipe, TuiLabel, TuiTextfieldControllerModule, TuiTextarea, TuiTextfield],
    templateUrl: './confirm-reject.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmRejectComponent {
    /**
     * Форма, содержащая поле причины отказа.
     */
    protected readonly form = new FormGroup({
        reason: new FormControl<string | null>(null, [Validators.required]),
    });

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
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, { userId: string, type: 'settlement' | 'user' }> = inject<TuiDialogContext<void, { userId: string, type: 'settlement' | 'user' }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Инициализирует экземпляр класса {@link ConfirmRejectComponent}.
     */
    public constructor() {
        this.onSubmit.pipe(
            filter(() => this.form.valid),
            tap(() => {
                const reason = this.form.controls.reason.value ?? '';

                switch (this.context.data.type) {
                    case 'settlement': {
                        this.settlementService.postVerifySettlementReject(this.context.data.userId, reason).pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess('Анкета отклонена!', this.context.$implicit),
                            takeUntilDestroyed(this.destroyRef))
                            .subscribe();

                        break;
                    }
                    case 'user': {
                        this.serverInfoService.postVerifyDeny(this.context.data.userId, reason).pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess('Анкета отклонена!', this.context.$implicit),
                            takeUntilDestroyed(this.destroyRef))
                            .subscribe();

                        break;
                    }
                }
            }),
            takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
