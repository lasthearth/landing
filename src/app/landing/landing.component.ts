import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, Observable, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { RouteKeys } from '@app/routes/enums/route-keys';
import { ProfileNavigationComponent } from '@app/profile/profile-navigation/profile-navigation.component';

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
    /**
     * Сервис навигации.
     */
    private readonly router = inject(Router);

    /**
     * Сервис предоставления информации о роуте.
     */
    private readonly activatedRoute = inject(ActivatedRoute);

    /**
     * {@link Observable} Текущего ключа роута.
     */
    protected readonly currentRouteKey$: Observable<RouteKeys> = this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
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
