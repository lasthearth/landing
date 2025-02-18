import { Component, inject } from '@angular/core';
import { NewsService } from '../services/news.service';

@Component({
    standalone: true,
    selector: 'app-home',
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
