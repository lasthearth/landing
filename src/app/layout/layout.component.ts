import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser, AsyncPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { UserService } from '@entities/user';
import { map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WelcomeComponent } from '@app/features/welcome/welcome.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { GameChatWidgetComponent } from '@features/game-chat/ui/game-chat-widget/game-chat-widget.component';
import { BackgroundParticlesComponent } from './background-particles/background-particles.component';
import { environment } from '@core/config/environments/environment';
import { LocalStorageService } from '@core/services/local-storage.service';
import { WELCOME_SEEN_STORAGE_KEY } from './welcome-seen-storage-key.constant';


/**
 * Компонент разметки.
 */
@Component({
    standalone: true,
    selector: 'app-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent, AsyncPipe, WelcomeComponent, BackgroundParticlesComponent, GameChatWidgetComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    /**
     * Сервис localStorage.
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Признак того, что пользователь уже пролистывал приветственный экран.
     * Читается один раз при создании компонента; на сервере localStorage
     * недоступен, и флаг остаётся `false`.
     */
    private readonly isWelcomeSeen: boolean =
        this.localStorage.getItem<boolean>(WELCOME_SEEN_STORAGE_KEY) ?? false;

    /**
     * {@link Observable} Признак необходимости показать приветственный экран.
     *
     * Опирается на `authSettled$`, который начинает выдавать значения только
     * после завершения проверки авторизации. Комбинация «состояние + признак
     * завершения» двумя отдельными потоками давала промежуточный кадр
     * `!isAuth && authChecked`, из-за чего экран показывался авторизованному
     * пользователю сразу после входа.
     *
     * Дополнительно экран гейтится флагом «уже видел welcome»: после первого
     * пролистывания он сохраняется в localStorage, и на последующих визитах
     * экран не рендерится вовсе. Чтение флага идёт через
     * {@link LocalStorageService}, поэтому на сервере (SSR/prerender),
     * где localStorage отсутствует, экран показывается как прежде.
     */
    protected readonly showWelcome$: Observable<boolean> = inject(UserService).authSettled$.pipe(
        map((isAuth) => !isAuth && !this.isWelcomeSeen)
    );

    /**
     * Окружение для доступа к идентификаторам Discord-каналов в шаблоне.
     */
    protected readonly environment = environment;

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
        this.showWelcome$.pipe(takeUntilDestroyed()).subscribe((showWelcome) => {
            this.updateScrollLock(showWelcome && !this.isSetScrollClass);
        });
    }

    /**
     * Блокирует или разблокирует прокрутку страницы.
     *
     * @param lock true — заблокировать скролл, false — разблокировать.
     */
    private updateScrollLock(lock: boolean): void {
        if (!isPlatformBrowser(this.platformId)) {
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
     *
     * Первое пролистывание запоминается в localStorage: на последующих
     * визитах экран больше не показывается. В текущей сессии компонент
     * остаётся в DOM с классом `.scroll`, чтобы доиграть анимацию ухода.
     */
    public onWelcomeScroll() {
        if (this.isSetScrollClass) {
            return;
        }

        this.isSetScrollClass = true;
        this.localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, true);
        this.updateScrollLock(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.cdr.detectChanges();
    }
}
