import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError, TuiLabel } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextareaModule, TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { Subject, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerInformationService } from '../../services/server-information.service';

/**
 * Компонент создания вопроса для верификации.
 */
@Component({
    standalone: true,
    selector: 'app-create-question',
    imports: [TuiError, ReactiveFormsModule, FormsModule, TuiTextareaModule, TuiInputModule, TuiFieldErrorPipe, AsyncPipe, TuiLabel, TuiTextfieldControllerModule],
    templateUrl: './create-question.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateQuestionComponent {
    /**
     * Форма создания вопроса.
     */
    protected readonly form = new FormGroup({
        question: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
    });

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfoService: ServerInformationService = inject(ServerInformationService);

    /**
    * Ссылка уничтожения на компонент.
    */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Контекст открытого диалогового окна.
     */
    private readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Инициализирует компонент класса {@link CreateQuestionComponent}
     */
    public constructor() {
        this.onSubmit.pipe(
            tap(() => {
                const qu = this.form.controls.question.value;
                if (qu !== null) {
                    this.serverInfoService.postQuestion(qu).subscribe();
                    this.context.$implicit.complete();
                }
            }),
            takeUntilDestroyed(this.destroyRef)).subscribe();
    }
}
