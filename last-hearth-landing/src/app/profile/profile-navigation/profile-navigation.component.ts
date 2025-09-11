import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserService } from '../../services/user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { RouteKeys } from '../../routes/enums/route-keys';

@Component({
    selector: 'app-profile-navigation',
    templateUrl: './profile-navigation.component.html',
    styleUrl: './profile-navigation.component.css',
    imports: [CommonModule, RouterLink, TuiIcon, AsyncPipe],
})
export class ProfileNavigationComponent implements OnInit {
    protected readonly userService = inject(UserService);

    protected select = 'how-play';

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    private readonly router = inject(Router);

    private readonly activatedRoute = inject(ActivatedRoute);

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }

    ngOnInit() {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
                startWith('how-play'),
            )
            .subscribe(() => {
                let route = this.activatedRoute;

                while (route.firstChild) {
                    route = route.firstChild;
                }

                const routeKey = route.snapshot.data['route_keys'];

                if (routeKey) {
                    switch (routeKey) {
                        case RouteKeys.stats:
                            this.select = 'stats';
                            break;
                        case RouteKeys.howPlay:
                            this.select = 'how-play';
                            break;
                        case RouteKeys.admin:
                            this.select = 'admin';
                            break;
                        case RouteKeys.settlement:
                            this.select = 'settlement';
                            break;
                    }
                }

                this.cdr.markForCheck();
            });
    }

}
