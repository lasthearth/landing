import { TuiRoot } from '@taiga-ui/core';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LayoutComponent } from './layout/layout.component';
import { SeoService } from '@core/services/seo.service';
import { ISeoData } from '@core/types/i-seo-data';
import { ReferralApplierService } from '@features/referral';

/**
 * Корневой компонент приложения.
 */
@Component({
    standalone: true,
    selector: 'app-root',
    imports: [LayoutComponent, TuiRoot],
    templateUrl: './app.component.html',
    styleUrl: './app.component.less',
})
export class AppComponent {
    /**
     * Сервис для установки SEO-метатегов.
     */
    private readonly seoService: SeoService = inject(SeoService);

    /**
     * Роутер приложения.
     */
    private readonly router: Router = inject(Router);

    /**
     * Сервис автоматического применения реферального кода из URL (?ref=).
     */
    private readonly referralApplier: ReferralApplierService = inject(ReferralApplierService);

    /**
     * Fallback SEO-данные, если роут не содержит своих.
     */
    private readonly defaultSeo: ISeoData = {
        title: 'Last Hearth — ролевой сервер Vintage Story',
        description:
            'Last Hearth — уникальный ролевой политико-экономический сервер Vintage Story. Развивайте поселения, ведите войны, заключайте союзы и участвуйте в жизни Империи.',
        keywords:
            'Vintage Story сервер, Last Hearth, ролевой сервер VS, Vintage Story PvP, Vintage Story RP',
        url: 'https://lasthearth.ru/home',
        type: 'website',
        locale: 'ru_RU',
        siteName: 'Last Hearth — ролевой сервер Vintage Story',
        image: 'https://lasthearth.ru/og-image.jpg',
        imageAlt: 'Last Hearth — ролевой сервер Vintage Story',
    };

    /**
     * Инициализирует корневой компонент и подписывается на смену роута
     * для обновления SEO-метатегов.
     */
    public constructor() {
        this.seoService.setSeoTags(this.defaultSeo);

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                map(() => {
                    const routeData = this.router.routerState.snapshot.root.firstChild?.firstChild?.data;

                    return (routeData?.['seo'] as ISeoData) ?? this.defaultSeo;
                }),
                takeUntilDestroyed()
            )
            .subscribe((seoData) => {
                this.seoService.setSeoTags(seoData);
            });
    }
}
