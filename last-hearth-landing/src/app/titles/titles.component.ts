import { ChangeDetectorRef, Component, DestroyRef, inject, input, InputSignal } from '@angular/core';
import { TitleCardComponent } from './title-card/title-card.component';
import { TitlesService } from '../services/titles.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { HowToBuyComponent } from './how-to-buy/how-to-buy/how-to-buy.component';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { ITitles } from './interfaces/i-titles';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { RouteKeys } from '../routes/enums/route-keys';

@Component({
    standalone: true,
    selector: 'app-titles',
    imports: [TitleCardComponent, RouterOutlet, RouterLink, TuiCarousel, TuiPagination, TuiIcon],
    templateUrl: './titles.component.html',
    styleUrl: './titles.component.less',
})
export class TitlesComponent {
    /**
     * Список титулов.
     */
    protected readonly titles = inject(TitlesService).titles;

    protected index = 0;

    private readonly router = inject(Router);

    private readonly dialogs = inject(TuiDialogService);

    /**
     * Данные титула или набора.
     */
    public data: InputSignal<ITitles> = input.required();

    protected howBuyTitle() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'l' }).subscribe();
    }

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Объект с информацией о текущем роуте.
     */
    private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);

    /**
     * Инициализирует компонент класса
     */
    public constructor() {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
                startWith('knight'),
            )
            .subscribe(() => {
                let route = this.activatedRoute;

                while (route.firstChild) {
                    route = route.firstChild;
                }

                const routeKey = route.snapshot.data['route_keys'];

                if (routeKey) {
                    switch (routeKey) {
                        case RouteKeys.knight:
                        case RouteKeys.baron:
                            this.index = 0;
                            break;
                        case RouteKeys.graph:
                            this.index = 1;
                            break;
                        case RouteKeys.duke:
                            this.index = 2;
                            break;
                        case RouteKeys.explorer:
                            this.index = 3;
                            break;
                        case RouteKeys.warrior:
                        case RouteKeys.builder:
                            this.index = 4;
                            break;
                    }
                    this.cdr.markForCheck();
                }
            });
    }

    protected nextCard() {
        if (this.index === this.titles.length - 3) {
            this.index = 0;
        } else {
            this.index += 1;
        }
    }

    protected prevCard() {
        if (this.index === 0) {
            this.index = this.titles.length - 3;
        } else {
            this.index -= 1;
        }
    }
}
