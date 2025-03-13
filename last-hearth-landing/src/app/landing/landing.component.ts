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
import { filter, map } from "rxjs";
import { TuiIcon } from "@taiga-ui/core";
import { RouteKeys } from "../routes/enums/route-keys";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
    standalone: true,
    selector: "app-landing",
    imports: [
        HeaderComponent,
        RouterOutlet,
        RouterLink,
        AsyncPipe,
        NgClass,
        TuiIcon,
        NgTemplateOutlet,
    ],
    templateUrl: "./landing.component.html",
    styleUrl: "./landing.component.less",
})
export class LandingComponent {
    private readonly serverInformationService = inject(
        ServerInformationService
    );

    private readonly activatedRoute = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly destroyRef = inject(DestroyRef);

    protected online$ = this.serverInformationService
        .getOnlinePlayersCount()
        .pipe(map((info) => info.count));

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
}
