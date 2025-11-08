import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { Component, inject, OnInit } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { UserService } from '@app/services/user.service';

@Component({
    selector: 'app-sign-out-confirm',
    templateUrl: './sign-out-confirm.component.html',
    styleUrls: ['./sign-out-confirm.component.css']
})
export class SignOutConfirmComponent {

    /**
       * Контекст открытого диалогового окна.
       */
    protected readonly context: TuiDialogContext = inject<TuiDialogContext>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    protected signOut() {
        this.userService.signOut();
        this.context.$implicit.complete();
    }
}
