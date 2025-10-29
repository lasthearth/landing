import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { UserService } from '@app/services/user.service';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { WelcomeComponent } from '@app/welcome/welcome.component';

/**
 * Компонент разметки.
 */
@Component({
    standalone: true,
    selector: 'app-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent, NgIf, AsyncPipe, WelcomeComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    /**
     * Сервис данных о пользователе.
     */
    protected readonly userAuth$: Observable<boolean> = inject(UserService).authState$;

    protected test = false;

    
}
