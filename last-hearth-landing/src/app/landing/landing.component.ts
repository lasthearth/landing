import { ChangeDetectionStrategy, Component, DestroyRef, inject } from "@angular/core";
import { HeaderComponent } from "../layout/header/header.component";
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    RouterLink,
    RouterOutlet,
} from "@angular/router";
import { AsyncPipe, NgClass } from "@angular/common";
import { filter } from "rxjs";
import { TuiIcon } from "@taiga-ui/core";
import { RouteKeys } from "../routes/enums/route-keys";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UserService } from "../services/user.service";
import { ServerInformationService } from "../services/server-information.service";

/**
 * Компонент лендинга.
 */
@Component({
    standalone: true,
    selector: "app-landing",
    imports: [
        HeaderComponent,
        RouterOutlet,
        RouterLink,
        NgClass,
        TuiIcon,
    ],
    templateUrl: "./landing.component.html",
    styleUrl: "./landing.component.less",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
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
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * Активная страница.
     */
    protected select: string = "home";

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

                const routeKey = route.snapshot.data["route_keys"];

                if (routeKey) {
                    switch (routeKey) {
                        case RouteKeys.home:
                            this.select = "home";
                            break;
                        case RouteKeys.rules:
                            this.select = "rules";
                            break;
                        case RouteKeys.market:
                            this.select = "market";
                            break;
                        case RouteKeys.profile:
                            this.select = "profile";
                            break;
                        case RouteKeys.stats:
                            this.select = "profile";
                            break;
                        case RouteKeys.howPlay:
                            this.select = "profile";
                            break;
                        case RouteKeys.startGame:
                            this.select = "startGame";
                            break;
                    }
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
