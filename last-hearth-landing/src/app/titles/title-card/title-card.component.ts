import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    inject,
    input,
    InputSignal,
} from '@angular/core';
import { ITitles } from '../interfaces/i-titles';
import { NgClass } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { RouteKeys } from '../../routes/enums/route-keys';

@Component({
    selector: 'app-title-card',
    imports: [NgClass, RouterLink],
    templateUrl: './title-card.component.html',
    styleUrl: './title-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleCardComponent {
    /**
     * Данные новости.
     */
    public data: InputSignal<ITitles> = input.required();

    protected routePath!: string;
    /**
     * Объект с информацией о текущем роуте.
     */
    private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);

    public ngOnInit() {
        this.routePath = `/titles/${this.data().path}`;
    }

    /**
     * Сервис навигации.
     */
    private readonly router: Router = inject(Router);

    /**
     * Активная страница.
     */
    protected select: string = 'knight';

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    private readonly cdr = inject(ChangeDetectorRef);

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
                            this.select = 'knight';
                            break;
                        case RouteKeys.baron:
                            this.select = 'baron';
                            break;
                        case RouteKeys.graph:
                            this.select = 'graph';
                            break;
                        case RouteKeys.duke:
                            this.select = 'duke';
                            break;
                    }
                    this.cdr.markForCheck();
                }
            });
    }
}
