import { Component, DestroyRef, inject } from "@angular/core";
import { HeaderComponent } from "../layout/header/header.component";
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    RouterLink,
    RouterOutlet,
} from "@angular/router";
import { ServerInformationService } from "../services/server-information.service";
import { AsyncPipe, NgClass, NgTemplateOutlet } from "@angular/common";
import { filter, map, tap } from "rxjs";
import { TuiIcon } from "@taiga-ui/core";
import { RouteKeys } from "../routes/enums/route-keys";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UserService } from "../services/user.service";

@Component({
    standalone: true,
    selector: "app-landing",
    imports: [
        HeaderComponent,
        RouterOutlet,
        RouterLink,
        NgClass,
        TuiIcon,
        AsyncPipe
    ],
    templateUrl: "./landing.component.html",
    styleUrl: "./landing.component.less",
})
export class LandingComponent {
    private readonly activatedRoute = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly destroyRef = inject(DestroyRef);

    protected readonly userService = inject(UserService);

    protected select = "home";

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
                        default:
                            this.select = "home";
                            break;
                    }
                }
            });
    }

    protected signIn(): void {
        this.userService.signIn();
    }

    protected signOut(): void {
        this.userService.signOut();
    }
}
