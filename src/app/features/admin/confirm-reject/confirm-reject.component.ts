import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError, TuiIcon } from '@taiga-ui/core';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { Subject, filter, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VerificationService } from '@features/verification';
import { SettlementService } from '@entities/settlement';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';


/**
 * Компонент подтверждения отклонения.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-reject',
    imports: [TuiError, ReactiveFormsModule, FormsModule, TuiFieldErrorPipe, AsyncPipe, TuiIcon, LHInputComponent, TranslatePipe],
    templateUrl: './confirm-reject.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
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
    private readonly verificationService: VerificationService = inject(VerificationService);

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
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Ключи переводов типовых причин отклонения анкеты.
     */
    protected readonly quickReasons: string[] = [
        'admin.verification.quickReasons.readRules',
        'admin.verification.quickReasons.wrongNickname',
        'admin.verification.quickReasons.policyMismatch',
        'admin.verification.quickReasons.notDetailed',
        'admin.verification.quickReasons.badContacts',
    ];

    /**
     * Подставляет выбранную типовую причину в поле формы.
     *
     * @param reason Текст причины.
     */
    protected selectReason(reason: string): void {
        this.form.controls.reason.setValue(this.i18n.translate(reason));
    }

    /**
     * Инициализирует экземпляр класса {@link ConfirmRejectComponent}.
     */
    public constructor() {
        this.onSubmit.pipe(
            filter(() => this.form.valid),
            tap(() => {
                const reason = (this.form.controls.reason.value ?? '').trim();

                switch (this.context.data.type) {
                    case 'settlement': {
                        this.settlementService.postVerifySettlementReject(this.context.data.userId, reason).pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess(this.i18n.translate('admin.verification.rejectSuccess'), this.context.$implicit),
                            takeUntilDestroyed(this.destroyRef))
                            .subscribe();

                        break;
                    }
                    case 'user': {
                        this.verificationService.postVerifyDeny(this.context.data.userId, reason).pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess(this.i18n.translate('admin.verification.rejectSuccess'), this.context.$implicit),
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
