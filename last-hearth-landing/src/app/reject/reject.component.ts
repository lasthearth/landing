import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators, MaxLengthValidator } from '@angular/forms';
import { TuiAlertService, TuiDialogContext, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiTextarea } from '@taiga-ui/kit';
import { TuiTextareaModule, TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { Subject, filter, tap } from 'rxjs';
import { ServerInformationService } from '../services/server-information.service';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
    selector: 'app-reject',
    imports: [TuiError, ReactiveFormsModule, FormsModule, TuiTextareaModule, TuiInputModule, TuiFieldErrorPipe, AsyncPipe, TuiLabel, TuiTextfieldControllerModule, TuiTextarea, TuiTextfield],
    templateUrl: './reject.component.html',
})
export class RejectComponent {
    protected readonly form = new FormGroup({
        reason: new FormControl<string | null>(null, [Validators.required]),
    });

    private readonly serverInfoService = inject(ServerInformationService);

    protected readonly context: TuiDialogContext<void, string> = inject<TuiDialogContext<void, string>>(POLYMORPHEUS_CONTEXT);

    private readonly alerts = inject(TuiAlertService);

    /**
     * {@link Subject} события отправки формы.
     */
    public readonly onSubmit: Subject<void> = new Subject<void>();

    private readonly request$ = this.onSubmit.pipe(filter(() => this.form.valid), tap(() => {
        const reason = this.form.controls.reason.value ? this.form.controls.reason.value : '';

        this.serverInfoService.postVerifyDeny(this.context.data, reason).subscribe();

        this.alerts
            .open('', { label: 'Анкета отклонена!', appearance: 'positive', })
            .subscribe();

        this.context.$implicit.complete();
    })).subscribe();
}
