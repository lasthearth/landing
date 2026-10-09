import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { RouteKeys } from '@app/routes/enums/route-keys';
import { ProfileNavigationComponent } from '@app/features/profile/profile-navigation/profile-navigation.component';

/**
 * Компонент лендинга.
 */
@Component({
    standalone: true,
    selector: 'app-landing',
    imports: [RouterOutlet, ProfileNavigationComponent],
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
    private readonly currentRouteKey = toSignal<RouteKeys | undefined>(
        this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => {
            let route = this.activatedRoute;

            while (route.firstChild) {
                route = route.firstChild;
            }

            return route.snapshot?.data?.['route_keys'];
        })
        )
    );


    /**
     * Проверяет, является ли данный ключ маршрута страницей профиля.
     * @param routeKey Ключ маршрута для проверки
     * @returns true если маршрут относится к профилю, иначе false
     */
    private isProfilePage(routeKey: RouteKeys): boolean {
        return [
            RouteKeys.admin,
            RouteKeys.stats,
            RouteKeys.howPlay,
            RouteKeys.settlement,
            RouteKeys.referral,
            RouteKeys.profileStyle
        ].includes(routeKey);
    }

    /**
     * Признак, что открыта страница раздела профиля (показывается навигация профиля).
     */
    protected readonly isProfilePageActive = computed(() => {
        const key = this.currentRouteKey();

        return key !== undefined && key !== null && this.isProfilePage(key);
    });

    /**
     * Документ — для класса-флага на body.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Инициализирует компонент: синхронизирует класс `lh-has-bottom-bar` на body.
     * На мобильных навигация профиля — фиксированная панель внизу экрана,
     * и плавающий чат по этому классу поднимается над ней.
     */
    public constructor() {
        effect(() => {
            this.document.body.classList.toggle('lh-has-bottom-bar', this.isProfilePageActive());
        });
    }
}
