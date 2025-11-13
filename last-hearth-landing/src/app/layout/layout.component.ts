import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from '@app/services/user.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { WelcomeComponent } from '@app/welcome/welcome.component';
import { FooterComponent } from '@layout/footer/footer.component';
import { HeaderComponent } from '@layout/header/header.component';

/**
 * Компонент разметки.
 */
@Component({
    standalone: true,
    selector: 'app-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent, AsyncPipe, WelcomeComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    /**
     * {@link Observable} Состояния авторизации пользователя.
     */
    protected readonly userAuth$: Observable<boolean> = inject(UserService).authState$;

    /**
     * Объект детекции изменений.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Признак того, установлен ли класс пролистывания.
     */
    protected isSetScrollClass = false;

    /**
     * Признак того, скрыт ли приветственный экран.
     */
    protected isWelcomeHide = false;

    /**
     * Производит пролистывание приветственного экрана.
     */
    public onWelcomeScroll() {
        if (this.isSetScrollClass) {
            return;
        }

        this.isSetScrollClass = true;
        this.cdr.markForCheck();

        setTimeout(() => {
            this.isWelcomeHide = true;
            this.cdr.markForCheck();
        }, 100);
    }
}
