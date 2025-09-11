import { RouteKeys } from './../routes/enums/route-keys';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ProfileNavigationComponent } from '../profile/profile-navigation/profile-navigation.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, Observable, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';

/**
 * Компонент лендинга.
 */
@Component({
    standalone: true,
    selector: 'app-landing',
    imports: [RouterOutlet, ProfileNavigationComponent, AsyncPipe],
    templateUrl: './landing.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
    private readonly router = inject(Router);

    private readonly activatedRoute = inject(ActivatedRoute);

    protected readonly currentRouteKey$: Observable<RouteKeys> = this.router.events
        .pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(null),
            map(() => {
                let route = this.activatedRoute;

                while (route.firstChild) {
                    route = route.firstChild;
                }

                return route.snapshot.data['route_keys'];
            })
        );
}
