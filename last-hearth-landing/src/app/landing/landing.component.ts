import { Component, inject } from '@angular/core';
import {TuiCarousel} from '@taiga-ui/kit';
import { NewsCardComponent } from '../news/news-card/news-card.component';
import { HeaderComponent } from '../layout/header/header.component';
import { NewsService } from '../services/news.service';

@Component({
    standalone: true,
    selector: 'app-landing',
    imports: [TuiCarousel, NewsCardComponent, HeaderComponent],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.less'
})
export class LandingComponent  {
    protected carouselIndex: number = 0;

    private readonly imagesPath: string = '/images/screenshots/';

    protected readonly images: string[] = [
        `${this.imagesPath}screen_1.png`,
        `${this.imagesPath}screen_2.png`,
        `${this.imagesPath}screen_3.png`,
        `${this.imagesPath}screen_4.png`
    ];

    protected readonly news = inject(NewsService).news;
}
