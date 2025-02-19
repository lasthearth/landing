import { Component, inject } from '@angular/core';
import { TuiCarousel } from '@taiga-ui/kit';
import { NewsCardComponent } from '../news/news-card/news-card.component';
import { NewsService } from '../services/news.service';
import { NgClass } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, NgClass],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
})
export class HomeComponent  {
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
