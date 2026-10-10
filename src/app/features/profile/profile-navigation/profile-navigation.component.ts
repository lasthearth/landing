import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserService } from '@entities/user';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { RouteKeys } from '@routes/enums/route-keys';
import { TranslatePipe } from '@core/i18n';
import { TuiPulse } from '@taiga-ui/kit';
import { NotificationService } from '@core/services/notification.service';

@Component({
    selector: 'app-profile-navigation',
    templateUrl: './profile-navigation.component.html',
    imports: [CommonModule, RouterLink, RouterLinkActive, TuiIcon, AsyncPipe, TuiPulse, TranslatePipe],
})
export class ProfileNavigationComponent {
    protected readonly userService = inject(UserService);

    private readonly notificationService = inject(NotificationService);

    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

    protected readonly invitations$ = this.notificationService.invitations$;
    protected readonly userVerifications$ = this.notificationService.userVerifications$;
    protected readonly settlementVerifications$ = this.notificationService.settlementVerifications$;

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }
}
