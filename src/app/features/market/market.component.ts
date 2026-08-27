import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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

/**
 * Компонент магазина привилегий.
 */
@Component({
    selector: 'app-market',
    imports: [TitlesComponent, KitsComponent, SpecialComponent, TuiIcon, TranslatePipe, AsyncPipe],
    templateUrl: './market.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex = signal(0);

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
