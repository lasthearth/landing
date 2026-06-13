import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiError } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';

import { Subject, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RuleQuestionApiService } from '@entities/rule-question';
import { RequestStatusService } from '@core/services/request-status.service';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';

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
        LHInputComponent,
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
     * API-сервис для работы с вопросами правил.
     */
    private readonly api = inject(RuleQuestionApiService);

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
     * Событие успешного создания вопроса.
     */
    readonly created = output<void>();

    /**
     * Инициализирует компонент класса {@link CreateQuestionFormComponent}
     */
    public constructor() {
        this.onSubmit
            .pipe(
                tap(() => {
                    const question = this.form.controls.question.value;
                    if (question !== null) {
                        this.api
                            .create(question)
                            .pipe(
                                this.requestStatusService.handleError(),
                                this.requestStatusService.handleSuccess('Вопрос создан!'),
                                takeUntilDestroyed(this.destroyRef)
                            )
                            .subscribe(() => this.created.emit());
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
