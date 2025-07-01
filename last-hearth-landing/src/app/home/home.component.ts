import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { NewsCardComponent } from '../news/news-card/news-card.component';
import { NewsService } from '../services/news.service';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, TuiPagination],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
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
        `${this.imagesPath}screen_0.jpg`,
        `${this.imagesPath}screen_5.jpg`,
        `${this.imagesPath}screen_6.jpg`,
        `${this.imagesPath}screen_7.jpg`,
        `${this.imagesPath}screen_8.jpg`,
        `${this.imagesPath}screen_9.jpg`,
        `${this.imagesPath}screen_10.jpg`,
    ];

    /**
     * Список новостей.
     */
    protected readonly news = inject(NewsService).news;
}
