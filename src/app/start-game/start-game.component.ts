import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';
import { AsyncPipe } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-start-game',
    imports: [RouterLink, AsyncPipe],
    templateUrl: './start-game.component.html',
    styleUrl: './start-game.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartGameComponent {
    protected readonly userService: UserService = inject(UserService);

    /**
     * Авторизация пользователя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }
}
