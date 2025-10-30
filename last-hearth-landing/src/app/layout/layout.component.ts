import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { UserService } from '@app/services/user.service';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { WelcomeComponent } from '@app/welcome/welcome.component';
import { LocalStorageService } from '@app/services/local-storage.service';

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
    private readonly localStorageService = inject(LocalStorageService);
    /**
     *
     */
    constructor() {
        this.test = this.localStorageService.getItem<boolean>('welcomeWasWatched') ? true : false;
    }
    /**
     * Сервис данных о пользователе.
     */
    protected readonly userAuth$: Observable<boolean> = inject(UserService).authState$;

    private readonly cdr = inject(ChangeDetectorRef);

    protected isCanScroll = false;
    protected isWelcomeHide = false;

    protected test = false;

    public onWelcomeScroll() {
        this.isCanScroll = true;
        setTimeout(() => {
            this.isWelcomeHide = true;
            this.cdr.markForCheck();
        }, 500);

        setTimeout(() => {
            this.localStorageService.setItem('welcomeWasWatched', true);
            this.cdr.markForCheck();
        }, 2000);
    }
}
