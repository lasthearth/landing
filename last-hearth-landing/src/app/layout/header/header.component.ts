import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { TuiProgress, TuiPulse } from '@taiga-ui/kit';
import { filter, map, Observable } from 'rxjs';
import { AsyncPipe, NgClass } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { RouterLink, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { RouteKeys } from '@app/routes/enums/route-keys';
import { NotificationService } from '@app/services/notification.service';
import { ServerInformationService } from '@app/services/server-information.service';
import { UserService } from '@app/services/user.service';
import { SignOutConfirmComponent } from '@layout/sign-out-confirm/sign-out-confirm.component';

/**
 * Компонент заголовка.
 */
@Component({
    standalone: true,
    selector: 'app-header',
    imports: [TuiProgress, AsyncPipe, TuiIcon, NgClass, RouterLink, TuiIcon, TuiPulse],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    /**
     * Сервис информации о сервере.
     */
    private readonly serverInformationService: ServerInformationService = inject(ServerInformationService);

    /**
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * {@link Observable} Количества онлайна.
     */
    protected readonly online$: Observable<{
        count: number;
        max: number;
    }> = this.serverInformationService.getOnlinePlayersCount$().pipe(map((info) => info));

    /**
     * {@link Observable} Даты и времени сервера.
     */
    protected readonly time$: Observable<string> = this.serverInformationService
        .getTime$()
        .pipe(map((info) => info.formatted_time));

    /**
     * Объект с информацией о текущем роуте.
     */
    private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);

    /**
     * Сервис навигации.
     */
    private readonly router: Router = inject(Router);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис уведомлений.
     */
    private readonly notificationService: NotificationService = inject(NotificationService);

    /**
     * {@link Observable} Списка приглашений в селения.
     */
    protected readonly invitations$ = this.notificationService.invitations$;

    /**
     * {@link Observable} Списка анкет на верификацию от пользователей.
     */
    protected readonly userVerifications$ = this.notificationService.userVerifications$;

    protected readonly settlementVerifications$ = this.notificationService.settlementVerifications$;

    /**
     * Активная страница.
     */
    protected select: string = 'home';

    /**
     * Объект слеженИя за изменениями.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Инициализирует компонент класса {@link LandingComponent}
     */
    public constructor() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                let route = this.activatedRoute;

                while (route.firstChild) {
                    route = route.firstChild;
                }

                const routeKey = route.snapshot.data['route_keys'];

                if (routeKey) {
                    switch (routeKey) {
                        case RouteKeys.home:
                            this.select = 'home';
                            break;
                        case RouteKeys.rules:
                            this.select = 'rules';
                            break;
                        case RouteKeys.profile:
                        case RouteKeys.howPlay:
                        case RouteKeys.stats:
                        case RouteKeys.admin:
                        case RouteKeys.settlement:
                            this.select = 'profile';
                            break;
                        case RouteKeys.startGame:
                            this.select = 'startGame';
                            break;
                        case RouteKeys.privacyPolicy:
                            this.select = 'privacyPolicy';
                            break;
                        case RouteKeys.publicOffer:
                            this.select = 'publicOffer';
                            break;
                        case RouteKeys.market:
                            this.select = 'market';
                            break;
                        case RouteKeys.faq:
                            this.select = 'faq';
                            break;
                        case RouteKeys.settlements:
                            this.select = 'settlements';
                            break;
                    }

                    this.cdr.markForCheck();
                }
            });
    }

    /**
     * Авторизует пользователя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }

    /**
     * Открывает диалоговое окно подтверждения выхода из аккаунта.
     */
    protected signOut(): void {
        this.dialogs.open(new PolymorpheusComponent(SignOutConfirmComponent), { size: 's' }).subscribe();
    }

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }
}
