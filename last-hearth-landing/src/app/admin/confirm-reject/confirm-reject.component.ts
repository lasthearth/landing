import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiAlertService, TuiDialogContext, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiTextarea } from '@taiga-ui/kit';
import { TuiTextareaModule, TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { Subject, Subscription, catchError, filter, tap, throwError } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerInformationService } from '../../services/server-information.service';
import { SettlementService } from '../../services/settlement.service';

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
    protected readonly context: TuiDialogContext<void, { userId: string, isSettlement: boolean }> = inject<TuiDialogContext<void, { userId: string, isSettlement: boolean }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис уведомлений.
     */
    private readonly alertService: TuiAlertService = inject(TuiAlertService);

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

                if (this.context.data.isSettlement) {
                    this.settlementService.postVerifySettlementReject(this.context.data.userId, reason).pipe(
                        catchError((error) => {
                            this.alertService
                                .open('', { label: 'Произошла непредвиденная ошибка.', appearance: 'negative', })
                                .subscribe();
                            return throwError(() => error)
                        }),
                        tap(() => {
                            this.alertService
                                .open('', { label: 'Анкета отклонена!', appearance: 'positive', })
                                .subscribe();
                            this.context.$implicit.complete();
                        }),
                        takeUntilDestroyed(this.destroyRef))
                        .subscribe();
                }
                else {
                    this.serverInfoService.postVerifyDeny(this.context.data.userId, reason).pipe(
                        catchError((error) => {
                            this.alertService
                                .open('', { label: 'Произошла непредвиденная ошибка.', appearance: 'negative', })
                                .subscribe();
                            return throwError(() => error)
                        }),
                        tap(() => {
                            this.alertService
                                .open('', { label: 'Анкета отклонена!', appearance: 'positive', })
                                .subscribe();
                            this.context.$implicit.complete();
                        }),
                        takeUntilDestroyed(this.destroyRef))
                        .subscribe();
                }
            }),
            takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
