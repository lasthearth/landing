import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import { NewsCardComponent } from '@app/news/news-card/news-card.component';
import { NewsService } from '@app/services/news.service';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, TuiPagination, TuiIcon, TuiPagination],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
    /**
     * Номер элемента карусели.
     */
    protected carouselIndex: number = 0;

    /**
     * Номер страницы.
     */
    protected pageIndex: number = 0;

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

    /**
     * Список новостей открытой страницы.
     */
    protected pageNews: {
        title: string;
        date: string;
        image: string;
        description: string;
    }[] = [];

    /** @inheritdoc */
    public ngOnInit(): void {
        this.pageNews = this.news.slice(0, 3);
    }

    /**
     * Производит переключение изображений в карусели.
     *
     * @param direction Направление (1 - вправо, -1 влево).
     */
    protected navigate(direction: number): void {
        if (direction > 0) {
            this.carouselIndex = this.carouselIndex === this.images.length - 1 ? 0 : this.carouselIndex + 1;
        }

        if (direction < 0) {
            this.carouselIndex = this.carouselIndex === 0 ? this.images.length - 1 : this.carouselIndex - 1;
        }
    }

    /**
     * Возвращает количество страниц для всех новостей.
     */
    protected getPagesCount(): number {
        return Math.round(this.news.length / 3);
    }

    /**
     * Производит переход на страницу с номером.
     *
     * @param index Номер страницы.
     */
    protected goToPage(index: number): void {
        this.pageIndex = index;
        this.pageNews = this.news.slice(this.pageIndex * 3, this.pageIndex * 3 + 3);
    }
}
