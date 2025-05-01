import { Component, DestroyRef, inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { IUser } from '../services/interface/i-user';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { VerificationComponent } from '../verification/verification.component';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RouteKeys } from '../routes/enums/route-keys';
import { ServerInformationService } from '../services/server-information.service';

@Component({
    standalone: true,
    imports: [TuiIcon, NgIf, RouterOutlet, RouterLink, NgClass, AsyncPipe],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
})
export class ProfileComponent {
    private readonly userService = inject(UserService);

    protected select = "stats";

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly destroyRef = inject(DestroyRef);

    private readonly dialogs = inject(TuiDialogService);

    private readonly router = inject(Router);

    private readonly activatedRoute = inject(ActivatedRoute);

    protected readonly code$ = inject(ServerInformationService).getCode();

    protected readonly status$ = inject(ServerInformationService).getStatus();

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
                        case RouteKeys.stats:
                            this.select = "stats";
                            break;
                        case RouteKeys.howPlay:
                            this.select = "how-play";
                            break;
                    }
                }
            });
    }

    protected signOut(): void {
        this.userService.signOut();
    }

    protected getRoleName() {
        if (this.userService.roles.includes('admin')) {
            return 'Администратор'
        }

        if (this.userService.roles.includes('player')) {
            return 'Игрок'
        }

        return 'Неверифицирован'
    }

    protected verification() {
        this.dialogs.open(new PolymorpheusComponent(VerificationComponent), { size: 'l' }).subscribe();
    }
}
