import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Subject, tap, finalize } from 'rxjs';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { UserService } from '@entities/user';
import { TicketWebhookService } from '@shared/lib/ticket-webhook/ticket-webhook.service';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';

/**
 * Компонент формы обращения (тикета).
 */
@Component({
    selector: 'app-ticket-form',
    templateUrl: './ticket-form.component.html',
    imports: [
        LHInputComponent,
        ReactiveFormsModule,
        FormsModule,
        TuiError,
        TuiFieldErrorPipe,
        AsyncPipe,
        TranslatePipe,
        DatePipe,
    ],
    styleUrl: './ticket-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFormComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

    /**
     * Форма обращения.
     */
    protected readonly form = new FormGroup({
        discordTag: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        gameNickname: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        reason: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(20)],
        }),
    });

    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Признак загрузки отправки формы.
     */
    protected readonly isSubmitting = signal(false);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис отправки тикетов в Discord.
     */
    private readonly ticketWebhook: TicketWebhookService = inject(TicketWebhookService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Текущая дата для отображения в форме.
     */
    protected readonly currentDate = new Date();

    /**
     * Инициализирует компонент класса {@link TicketFormComponent}
     */
    public constructor() {
        this.onSubmit
            .pipe(
                tap(() => {
                    if (!this.form.valid) {
                        return;
                    }

                    this.isSubmitting.set(true);
                    const { discordTag, gameNickname, reason } = this.form.getRawValue();
                    const dateDisplay = this.currentDate.toLocaleString('ru-RU');
                    const siteUserId = this.userService.userId ?? '—';
                    const siteUsername = this.userService.userName ?? '—';

                    this.ticketWebhook
                        .sendTicket(
                            discordTag.trim(),
                            gameNickname.trim(),
                            reason.trim(),
                            dateDisplay,
                            siteUserId,
                            siteUsername
                        )
                        .pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess(
                                this.i18n.translate('ticket.success'),
                                this.context.$implicit
                            ),
                            finalize(() => this.isSubmitting.set(false)),
                            takeUntilDestroyed(this.destroyRef)
                        )
                        .subscribe();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
