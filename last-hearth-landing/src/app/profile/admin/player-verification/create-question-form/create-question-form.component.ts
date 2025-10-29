import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiError } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { Subject, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerInformationService } from '@services/server-information.service';
import { RequestStatusService } from '@app/services/request-status.service';
import { LInputComponent } from '@app/components/l-input/l-input.component';

/**
 * Компонент создания вопроса для верификации.
 */
@Component({
    standalone: true,
    selector: 'app-create-question-form',
    imports: [
        TuiError,
        ReactiveFormsModule,
        FormsModule,
        TuiFieldErrorPipe,
        AsyncPipe,
        TuiTextfieldControllerModule,
        LInputComponent
    ],
    templateUrl: './create-question-from.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateQuestionFormComponent {
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
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Инициализирует компонент класса {@link CreateQuestionFormComponent}
     */
    public constructor() {
        this.onSubmit
            .pipe(
                tap(() => {
                    const question = this.form.controls.question.value;
                    if (question !== null) {
                        this.serverInfoService.postQuestion(question).pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess('Вопрос создан!'),
                            takeUntilDestroyed(this.destroyRef))
                            .subscribe();
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }
}
