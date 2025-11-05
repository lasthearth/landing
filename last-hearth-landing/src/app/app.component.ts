import { TuiRoot } from '@taiga-ui/core';
import { Component, inject } from '@angular/core';
import { LayoutComponent } from './layout/layout.component';
import { SeoService } from './services/seo.service';
import { ISeoData } from './services/interface/i-seo-data';

@Component({
    standalone: true,
    selector: 'app-root',
    imports: [LayoutComponent, TuiRoot],
    templateUrl: './app.component.html',
    styleUrl: './app.component.less',
})
export class AppComponent {
    private readonly seoService: SeoService = inject(SeoService);

    private readonly seo: ISeoData = {
        title: 'Last Hearth',

        description: 'Last Hearth - уникальный ролевой сервер Vintage Story. Развивайте поселения от хутора до великого города, участвуйте в политике Империи, ведите войны и заключайте союзы. Присоединяйтесь к живому миру с экономикой, титулами и глубокой механикой PvP!',

        keywords: [
            'Vintage Story сервер',
            'Vintage Story Россия',
            'ролевой сервер VS',
            'Last Hearth',
            'Vintage Story RP',
            'сервер с поселениями',
            'Vintage Story PvP',
            'Vintage Story империя',
            'средневековый сервер',
            'Vintage Story титулы',
            'Vintage Story 2025',
            'рп сервер Vintage Story',
            'Vintage Story гильдии',
            'Vintage Story война',
            'Vintage Story экономика'
        ].join(', '),

        robots: 'index, follow',

        url: 'https://lasthearth.ru/home',

        type: 'website',

        locale: 'ru_RU',

        siteName: 'Last Hearth - Сервер Vintage Story',
    };

    /**
     * Инициализирует экземпляр класса {@link AppComponent}.
     */
    public constructor() {
        this.seoService.setSeoTags(this.seo);
    }
}
