import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from '@entities/user';
import { combineLatest, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WelcomeComponent } from '@app/features/welcome/welcome.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { BackgroundParticlesComponent } from './background-particles/background-particles.component';


/**
 * Компонент разметки.
 */
@Component({
    standalone: true,
    selector: 'app-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent, AsyncPipe, WelcomeComponent, BackgroundParticlesComponent],
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
     * {@link Observable} Признак завершения первоначальной проверки авторизации.
     */
    protected readonly isAuthChecked$: Observable<boolean> = inject(UserService).isAuthChecked$;

    /**
     * Объект детекции изменений.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Рендерер для безопасной манипуляции DOM.
     */
    private readonly renderer = inject(Renderer2);

    /**
     * Признак того, установлен ли класс пролистывания.
     */
    protected isSetScrollClass = false;

    constructor() {
        combineLatest([this.userAuth$, this.isAuthChecked$])
            .pipe(takeUntilDestroyed())
            .subscribe(([isAuth, authChecked]) => {
                const showWelcome = !isAuth && authChecked;
                this.updateScrollLock(showWelcome && !this.isSetScrollClass);
            });
    }

    /**
     * Блокирует или разблокирует прокрутку страницы.
     *
     * @param lock true — заблокировать скролл, false — разблокировать.
     */
    private updateScrollLock(lock: boolean): void {
        if (typeof window === 'undefined') {
            return;
        }

        if (lock) {
            this.renderer.setStyle(document.body, 'overflow', 'hidden');
        } else {
            this.renderer.removeStyle(document.body, 'overflow');
        }
    }

    /**
     * Производит пролистывание приветственного экрана.
     */
    public onWelcomeScroll() {
        if (this.isSetScrollClass) {
            return;
        }

        this.isSetScrollClass = true;
        this.updateScrollLock(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.cdr.detectChanges();
    }
}
