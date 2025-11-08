import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
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

    private readonly cdr = inject(ChangeDetectorRef);

    protected isCanScroll = false;
    protected isWelcomeHide = false;

    protected test = false;

    public onWelcomeScroll() {
        if (this.isCanScroll) {
            return;
        }

        this.isCanScroll = true;
        this.cdr.markForCheck();

        setTimeout(() => {
            this.isWelcomeHide = true;
            this.cdr.markForCheck();
        }, 100);
    }
}
