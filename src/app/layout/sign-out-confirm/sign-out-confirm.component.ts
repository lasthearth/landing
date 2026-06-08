import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { UserService } from '@app/services/user.service';

/**
 * Компонент диалогового окна "Подтверждение выхода".
 */
@Component({
    selector: 'app-sign-out-confirm',
    templateUrl: './sign-out-confirm.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    /**
     * Производит выход из аккаунта.
     */
    protected signOut() {
        this.userService.signOut();
        this.context.$implicit.complete();
    }
}
