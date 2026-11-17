import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserService } from '@entities/user';
import { catchError, filter, of, startWith, switchMap } from 'rxjs';
import { TranslatePipe } from '@core/i18n';
import { TuiPulse } from '@taiga-ui/kit';
import { NotificationService } from '@core/services/notification.service';
import { TicketApiService } from '@entities/ticket';

@Component({
    selector: 'app-profile-navigation',
    templateUrl: './profile-navigation.component.html',
    styleUrl: './profile-navigation.component.less',
    imports: [RouterLink, RouterLinkActive, TuiIcon, AsyncPipe, TuiPulse, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileNavigationComponent implements OnDestroy {
    protected readonly userService = inject(UserService);

    private readonly notificationService = inject(NotificationService);

    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

    private readonly ticketApi = inject(TicketApiService);

    /**
     * Хост-компонент: по нему ищется активная плашка ряда для центровки.
     */
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

    /**
     * Идентификатор платформы: прокрутка ряда возможна только в браузере.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Подписка на завершение навигации: центрует активную плашку ряда.
     */
    private readonly navigationSubscription = this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.centerActive());

    /**
     * Сколько обращений ждут прочтения ответа администрации. Пересчитывается
     * при каждом переходе: прочитав ответ, игрок уходит со страницы — и точка гаснет.
     */
    protected readonly supportUnread$ = this.userService.authState$.pipe(
        filter(Boolean),
        switchMap(() =>
            this.router.events.pipe(
                filter((event) => event instanceof NavigationEnd),
                startWith(null),
                switchMap(() => this.ticketApi.unreadCount().pipe(catchError(() => of(0))))
            )
        )
    );

    protected readonly invitations$ = this.notificationService.invitations$;
    protected readonly userVerifications$ = this.notificationService.userVerifications$;
    protected readonly settlementVerifications$ = this.notificationService.settlementVerifications$;

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
    }

    /**
     * Освобождает подписку на события навигации.
     */
    public ngOnDestroy(): void {
        this.navigationSubscription.unsubscribe();
    }

    /**
     * Центрует активную плашку ряда в скролл-контейнере: на узком экране
     * текущий раздел виден вместе с соседними, а не уходит за край.
     * По вертикали прокрутки нет: `block: 'nearest'` не двигает страницу.
     */
    private centerActive(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        requestAnimationFrame(() => {
            const active = this.host.nativeElement.querySelector<HTMLElement>('.nav-button--active');

            if (!active) {
                return;
            }

            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            active.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
        });
    }
}
