import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { TranslatePipe } from '@core/i18n';
import { DonateService } from '@entities/donate';
import { UserService } from '@entities/user/api/user.service';
import { TitlesComponent } from './components/titles/titles.component';
import { KitsComponent } from './components/kits/kits.component';
import { SpecialComponent } from './components/special/special.component';
import { HowToBuyComponent } from './components/how-to-buy/how-to-buy.component';
import { PageHeaderComponent } from '@shared/ui/page-header';

/**
 * Компонент магазина привилегий.
 */
@Component({
    selector: 'app-market',
    imports: [PageHeaderComponent, TitlesComponent, KitsComponent, SpecialComponent, TuiIcon, TranslatePipe, AsyncPipe],
    templateUrl: './market.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
    /**
     * Текущий маршрут — для чтения вкладки из адреса.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * Сервис навигации — для записи вкладки в адрес.
     */
    private readonly router = inject(Router);

    /**
     * Ключи вкладок в адресе (`?tab=`), в порядке `tabs`.
     * Позволяют дать ссылку сразу на наборы или особые товары.
     */
    private readonly tabKeys = ['titles', 'kits', 'special'] as const;

    /**
     * Индекс открытой вкладки. Начальное значение берётся из `?tab=`.
     */
    protected readonly activeItemIndex = signal(
        Math.max(0, this.tabKeys.indexOf(this.route.snapshot.queryParamMap.get('tab') as (typeof this.tabKeys)[number]))
    );

    /**
     * Открывает вкладку и сохраняет её в адресе без новой записи в истории.
     *
     * @param index Индекс вкладки.
     */
    protected selectTab(index: number): void {
        this.activeItemIndex.set(index);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: index === 0 ? null : this.tabKeys[index] },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /**
     * Подписи вкладок магазина (ключи переводов) в порядке `activeItemIndex`.
     */
    protected readonly tabs = [
        'market.marketPage.tabPrivileges',
        'market.marketPage.tabKits',
        'market.marketPage.tabSpecial',
    ] as const;

    private readonly dialogs = inject(TuiDialogService);

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Текущий баланс осколков авторизованного игрока.
     *
     * Запрашивается только после авторизации, при ошибке поток молчит.
     */
    protected readonly balance$: Observable<string> = this.userService.authState$.pipe(
        filter((isAuth): isAuth is true => isAuth === true),
        switchMap(() =>
            this.donateService.getMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(''))
            )
        )
    );

    /**
     * Открывает диалог пополнения осколков.
     */
    protected howToBuy() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }
}
