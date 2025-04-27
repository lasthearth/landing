import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError, TuiLabel } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextareaModule, TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ServerInformationService } from '../services/server-information.service';
import { Subject, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
    selector: 'app-create-question',
    imports: [TuiError, ReactiveFormsModule, FormsModule, TuiTextareaModule, TuiInputModule, TuiFieldErrorPipe, AsyncPipe, TuiLabel, TuiTextfieldControllerModule],
    templateUrl: './create-question.component.html',
})
export class CreateQuestionComponent {
    protected readonly form = new FormGroup({
        question: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
    });

    private readonly serverInfoService = inject(ServerInformationService);

    private readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

    /**
     * {@link Subject} события отправки формы.
     */
    public readonly onSubmit: Subject<void> = new Subject<void>();

    private readonly request$ = this.onSubmit.pipe(tap(() => {
        const qu = this.form.controls.question.value;
        if (qu !== null) {
            this.serverInfoService.postQuestion(qu).subscribe();
            this.context.$implicit.complete();

        }
    })).subscribe();
}
