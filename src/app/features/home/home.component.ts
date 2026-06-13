import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import { NewsCardComponent } from '@app/features/news/ui/news-card/news-card.component';
import { NewsSkeletonComponent } from '@app/features/news/ui/news-skeleton/news-skeleton.component';
import { NewsApiService, mapDtoToNews } from '@entities/news';
import { UserService, Role, IPlayer } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { catchError, defaultIfEmpty, finalize, forkJoin, map, of, startWith, Subject, switchMap, take, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, NewsSkeletonComponent, TuiPagination, TuiIcon],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
    /**
     * API-сервис для работы с новостями.
     */
    private readonly api = inject(NewsApiService);

    /**
     * Сервис пользователя для проверки ролей.
     */
    private readonly userService = inject(UserService);

    /**
     * Subject для принудительного обновления списка.
     */
    private readonly refresh$ = new Subject<void>();

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак загрузки новостей.
     */
    readonly loading = signal(true);

    /**
     * Номер элемента карусели.
     */
    protected carouselIndex: number = 0;

    /**
     * Количество новостей на одной странице.
     */
    readonly pageSize = 3;

    /**
     * Текущий индекс страницы новостей.
     */
    readonly pageIndex = signal(0);

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
     * Поток новостей из API.
     *
     * При первой подписке и по refresh$ загружает данные заново.
     * Для неавторизованных пользователей имена авторов не разрешаются,
     * чтобы избежать 401-ошибок на защищённых эндпоинтах.
     */
    readonly news$ = this.refresh$.pipe(
        startWith(null),
        tap(() => this.loading.set(true)),
        switchMap(() => this.api.getList()),
        map((list) => list.map(mapDtoToNews)),
        switchMap((news) => {
            const authorIds = [...new Set(news.map((item) => item.createdBy).filter(Boolean))];

            if (authorIds.length === 0) {
                return of(news);
            }

            return this.userService.authState$.pipe(
                switchMap((isAuth) => {
                    if (!isAuth) {
                        return of(news);
                    }

                    return forkJoin(
                        authorIds.map((id) =>
                            this.userService.getPlayer$(id).pipe(
                                defaultIfEmpty(null),
                                catchError(() => of(null))
                            )
                        )
                    ).pipe(
                        map((players) => {
                            const playerMap = new Map(
                                players
                                    .filter((player): player is IPlayer => player !== null)
                                    .map((player) => [player.user_id, player.user_game_name])
                            );

                            return news.map((item) => ({
                                ...item,
                                createdBy: playerMap.get(item.createdBy) || item.createdBy,
                            }));
                        }),
                        catchError(() => of(news))
                    );
                })
            );
        }),
        tap(() => this.loading.set(false))
    );

    /**
     * Сигнал с массивом новостей.
     */
    readonly news = toSignal(this.news$, { initialValue: [] });

    /**
     * Общее количество страниц.
     */
    readonly totalPages = computed(() =>
        Math.ceil(this.news().length / this.pageSize)
    );

    /**
     * Новости текущей страницы.
     */
    readonly pageNews = computed(() => {
        const all = this.news();
        const start = this.pageIndex() * this.pageSize;

        return all.slice(start, start + this.pageSize);
    });

    /**
     * Флаг, указывающий, является ли текущий пользователь администратором.
     */
    readonly isAdmin = computed(() =>
        this.userService.roles.includes(Role.admin)
    );

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
        return this.totalPages();
    }

    /**
     * Производит переход на страницу с номером.
     *
     * @param index Номер страницы.
     */
    protected goToPage(index: number): void {
        this.pageIndex.set(index);
    }

    /**
     * Удаляет новость по идентификатору.
     *
     * Запрашивает подтверждение у пользователя перед удалением.
     * После успешного удаления обновляет список новостей.
     *
     * @param id Идентификатор новости для удаления.
     */
    protected deleteNews(id: string): void {
        this.confirmDialog
            .open({
                title: 'Удаление новости',
                text: 'Вы уверены, что хотите удалить эту новость? Это действие нельзя отменить.',
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (confirmed) => {
                    if (!confirmed) {
                        return;
                    }

                    this.api.delete(id).subscribe({
                        next: () => {
                            this.refresh$.next();
                        },
                        error: (err) => {
                            console.error('[News] Ошибка удаления новости:', err);
                        },
                    });
                },
            });
    }

    /**
     * Открывает новость по идентификатору.
     *
     * Вызывает GET /v1/news/{id}, который инкрементирует счетчик просмотров на сервере.
     * После успешного запроса обновляет список новостей.
     *
     * @param id Идентификатор новости.
     */
    protected openNews(id: string): void {
        this.api
            .getById(id)
            .pipe(take(1))
            .subscribe({
                next: () => {
                    this.refresh$.next();
                },
                error: (err) => {
                    console.error('[News] Ошибка открытия новости:', err);
                },
            });
    }
}
