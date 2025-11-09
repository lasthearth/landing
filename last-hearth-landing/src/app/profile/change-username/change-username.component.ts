import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LInputComponent } from '@app/components/l-input/l-input.component';
import { RequestStatusService } from '@app/services/request-status.service';
import { UserService } from '@app/services/user.service';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Subject, tap } from 'rxjs';
@Component({
  selector: 'app-change-username',
  templateUrl: './change-username.component.html',
  imports: [
    LInputComponent,
    ReactiveFormsModule,
    FormsModule],
  styleUrls: ['./change-username.component.css']
})

export class ChangeUsernameComponent implements OnInit {
/**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);
    
    protected readonly form = new FormGroup({
       newUserName: new FormControl<string | null>(null, [Validators.required]),
      
    });
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    private readonly userService: UserService = inject(UserService);
    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
  constructor() {
     this.onSubmit
            .pipe(
                tap(() => {
                    const newUserName = this.form.controls.newUserName.value;
                    if (newUserName !== null) {
                        this.userService.changeUsername$(newUserName).pipe(
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

  ngOnInit() {

  }
}
