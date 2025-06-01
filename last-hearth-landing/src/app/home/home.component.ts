import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiCarousel } from '@taiga-ui/kit';
import { NewsCardComponent } from '../news/news-card/news-card.component';
import { NewsService } from '../services/news.service';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent  {
    /**
     * Номер элемента карусели.
     */
    protected carouselIndex: number = 0;

    /**
     * Путь до элементов карусели.
     */
    private readonly imagesPath: string = '/images/screenshots/';

    /**
     * Массив элементов карусели.
     */
    protected readonly images: string[] = [
        `${this.imagesPath}screen_1.png`,
        `${this.imagesPath}screen_2.png`,
        `${this.imagesPath}screen_3.png`,
        `${this.imagesPath}screen_4.png`
    ];

    /**
     * Список новостей.
     */
    protected readonly news = inject(NewsService).news;
}
