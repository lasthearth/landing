import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    inject,
    KeyValueDiffers,
} from '@angular/core';
import { TuiProgress } from '@taiga-ui/kit';
import { filter, map, Observable } from 'rxjs';
import { ServerInformationService } from '../../services/server-information.service';
import { AsyncPipe, NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import { TuiIcon } from '@taiga-ui/core';
import { RouterOutlet, RouterLink, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouteKeys } from '../../routes/enums/route-keys';

/**
 * Компонент заголовка.
 */
@Component({
    standalone: true,
    selector: 'app-header',
    imports: [TuiProgress, AsyncPipe, TuiIcon, NgClass, RouterOutlet, RouterLink, NgClass, TuiIcon],
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
     * {@link Observable} Количества онлайна.
     */
    protected readonly online$: Observable<{
        count: number;
        max: number;
    }> = this.serverInformationService.getOnlinePlayersCount$().pipe(map(info => info));

    /**
     * {@link Observable} Даты и времени сервера.
     */
    protected readonly time$: Observable<string> = this.serverInformationService
        .getTime$()
        .pipe(map(info => info.formatted_time));

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
     * Активная страница.
     */
    protected select: string = 'home';

    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Инициализирует компонент класса {@link LandingComponent}
     */
    public constructor() {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
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
                        case RouteKeys.titles:
                        case RouteKeys.baron:
                        case RouteKeys.duke:
                        case RouteKeys.graph:
                        case RouteKeys.knight:
                        case RouteKeys.builder:
                        case RouteKeys.warrior:
                        case RouteKeys.explorer:
                            this.select = 'titles';
                            break;
                        case RouteKeys.faq:
                            this.select = 'faq';
                            break;
                    }
                    this.cdr.markForCheck();
                }
            });
    }

    /**
     * Авторизация пользователя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }
}
