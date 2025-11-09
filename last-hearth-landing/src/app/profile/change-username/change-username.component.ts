import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LInputComponent } from '@app/components/l-input/l-input.component';
import { RequestStatusService } from '@app/services/request-status.service';
import { UserService } from '@app/services/user.service';
import { TuiDialogContext, TuiError } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Subject, tap } from 'rxjs';

/*
* Компонент изменения игрового ника пользователя
*/
@Component({
  selector: 'app-change-username',
  templateUrl: './change-username.component.html',
  imports: [
    LInputComponent,
    ReactiveFormsModule,
    FormsModule,
    TuiError,
    TuiFieldErrorPipe,
    AsyncPipe],
  styleUrl: './change-username.component.css'
})

export class ChangeUsernameComponent {
     /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

     /**
     * Форма изменения никнейма.
     */
    protected readonly form = new FormGroup({
       newUsername: new FormControl<string | null>(null, [Validators.required]),
    });
    
    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

     /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис информации о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Инициализирует компонент класса {@link ChangeUsernameComponent}
    */
    public constructor() {
      this.onSubmit
              .pipe(
                  tap(() => {
                      const newUsername = this.form.controls.newUsername.value;
                      if (newUsername !== null) {
                          this.userService.changeUsername$(newUsername.trim()).pipe(
                              this.requestStatusService.handleError(),
                              this.requestStatusService.handleSuccess('Никнейм изменен!'),
                              takeUntilDestroyed(this.destroyRef))
                              .subscribe();
                      }
                  }),
                  takeUntilDestroyed(this.destroyRef),
              )
              .subscribe();
    }
}
