import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { NewsCardComponent } from '../news/news-card/news-card.component';
import { NewsService } from '../services/news.service';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, TuiPagination, TuiIcon],
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
    private readonly imagesPath: string = '/landing-carousel';

    /**
     * Массив элементов карусели.
     */
    protected readonly images = [
        {
            image: `${this.imagesPath}/1.webp`,
            isLight: false,
            header: 'Last Hearth',
            body: 'Проект где вы можете воплотить свои мечты',
        },
        {
            image: `${this.imagesPath}/5.webp`,
            isLight: true,
            header: 'Огромный мир',
            body: 'Исследуйте бескрайний мир и изучайте его красоты<br>Карта 256.000 блоков диаметром',
        },
        {
            image: `${this.imagesPath}/2.webp`,
            isLight: true,
            header: 'Поселения',
            body: 'Создавайте свои города и империи<br>Воюйте, торгуйте и ведите дипломатию',
        },
        {
            image: `${this.imagesPath}/3.webp`,
            isLight: true,
            header: 'Осады',
            body: 'Захватывайте крепости и замки<br>Штурмуйте стены и разбивайте ворота',
        },
        {
            image: `${this.imagesPath}/4.webp`,
            isLight: false,
            header: 'Нет приватов',
            body: 'На сервере отсутствуют приваты<br>Игровой процесс приближен к реальности',
        },
        {
            image: `${this.imagesPath}/6.webp`,
            isLight: true,
            header: 'Навигация',
            body: 'Скрафтите средства навигации, чтобы получить карту и координаты<br>Ориентирование в мире - важный аспект',
        },
        {
            image: `${this.imagesPath}/7.webp`,
            isLight: true,
            header: 'Моды',
            body: 'Мы постоянно разрабатываем собственные моды<br>Все это делает игру у нас уникальной',
        },
        {
            image: `${this.imagesPath}/8.webp`,
            isLight: true,
            header: 'Система правил',
            body: 'Продвинутая система правил<br>Собственная система логов дает гарантию их выполнения',
        },
    ];

    /**
     * Список новостей.
     */
    protected readonly news = inject(NewsService).news;

    protected navigate(direction: number): void {
        if (direction > 0) {
            this.carouselIndex = this.carouselIndex === this.images.length - 1 ? 0 : this.carouselIndex + 1;
        }

        if (direction < 0) {
            this.carouselIndex = this.carouselIndex === 0 ? this.images.length - 1 : this.carouselIndex - 1;
        }
    }
}
