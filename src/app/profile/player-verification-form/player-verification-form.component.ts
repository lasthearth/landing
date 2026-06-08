import { RequestStatusService } from '@services/request-status.service';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiDialogContext, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiInputModule, TuiTextareaModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ServerInformationService } from '@services/server-information.service';
import { filter, Observable, Subject, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { IVerifyData } from '@services/interface/i-verify-data';
import { UserService } from '@services/user.service';
import { TuiTextarea } from '@taiga-ui/kit';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IVerificationQuestion } from '@services/interface/i-verification-question';

@Component({
    standalone: true,
    selector: 'app-player-verification-form',
    imports: [
        TuiError,
        ReactiveFormsModule,
        FormsModule,
        TuiTextareaModule,
        TuiInputModule,
        TuiFieldErrorPipe,
        AsyncPipe,
        TuiLabel,
        TuiTextfieldControllerModule,
        TuiTextarea,
        TuiTextfield,
    ],
    templateUrl: './player-verification-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerVerificationFormComponent {
    /**
     * Форма заполнения данных верификации игрока.
     */
    protected readonly form = new FormGroup({
        gameName: new FormControl<string | null>(null, [Validators.required]),
        contacts: new FormControl<string | null>(null, Validators.required),
        question1: new FormControl<string | null>(null, [Validators.required]),
        answer1: new FormControl<string | null>(null, [Validators.required]),
        question2: new FormControl<string | null>(null, [Validators.required]),
        answer2: new FormControl<string | null>(null, [Validators.required]),
        question3: new FormControl<string | null>(null, [Validators.required]),
        answer3: new FormControl<string | null>(null, [Validators.required]),
        question4: new FormControl<string | null>(null, [Validators.required]),
        answer4: new FormControl<string | null>(null, [Validators.required]),
        question5: new FormControl<string | null>(null, [Validators.required]),
        answer5: new FormControl<string | null>(null, [Validators.required]),
    });

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис информации о сервере.
     */
    private readonly serverInfoService = inject(ServerInformationService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    protected readonly questions$: Observable<IVerificationQuestion[]> = this.serverInfoService.getQuestions$().pipe(
        tap((questions) => {
            this.form.controls.question1.setValue(questions[0].question);
            this.form.controls.question2.setValue(questions[1].question);
            this.form.controls.question3.setValue(questions[2].question);
            this.form.controls.question4.setValue(questions[3].question);
            this.form.controls.question5.setValue(questions[4].question);
        })
    );

    private readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * {@link Subject} события отправки формы.
     */
    public readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Инициализирует экземпляр класса {@link PlayerVerificationFormComponent}.
     */
    public constructor() {
        this.onSubmit
            .pipe(
                filter(() => this.form.valid),
                tap(() => {
                    const data = {
                        user_name: this.userService.userName,
                        user_game_name: this.form.controls.gameName.value?.trim(),
                        contacts: this.form.controls.contacts.value,
                        answers: [
                            {
                                question: this.form.controls.question1.value,
                                answer: this.form.controls.answer1.value,
                            },
                            {
                                question: this.form.controls.question2.value,
                                answer: this.form.controls.answer2.value,
                            },
                            {
                                question: this.form.controls.question3.value,
                                answer: this.form.controls.answer3.value,
                            },
                            {
                                question: this.form.controls.question4.value,
                                answer: this.form.controls.answer4.value,
                            },
                            {
                                question: this.form.controls.question5.value,
                                answer: this.form.controls.answer5.value,
                            },
                        ],
                    } as IVerifyData;

                    this.serverInfoService
                        .postVerifyUser(data)
                        .pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess(
                                'Анкета отправлена на модерацию!',
                                this.context.$implicit
                            ),
                            takeUntilDestroyed(this.destroyRef)
                        )
                        .subscribe();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
