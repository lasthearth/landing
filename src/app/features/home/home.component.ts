import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { NewsCardComponent } from '@app/features/news/ui/news-card/news-card.component';
import { NewsSkeletonComponent } from '@app/features/news/ui/news-skeleton/news-skeleton.component';
import { NewsApiService, mapDtoToNews } from '@entities/news';
import { UserService, Role } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { TicketFormComponent } from '@features/ticket/ticket-form/ticket-form.component';
import { I18nService, TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import { ServerInformationService } from '@core/services/server-information.service';
import { SettlementService } from '@entities/settlement';
import { DiscordGalleryService } from '@shared/lib/discord-gallery/discord-gallery.service';
import { formatServerTime } from '@app/layout/header/lib/format-server-time.function';
import { catchError, finalize, map, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Роль участника команды проекта.
 */
type TeamRole = 'founder' | 'coFounder' | 'techAdmin' | 'admin' | 'moderator';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, NewsSkeletonComponent, TuiPagination, TuiIcon, RouterLink, ImageLoaderComponent, TranslatePipe],
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
     * Сервис диалогов Taiga UI (открытие формы тикета).
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Сервис информации о сервере (онлайн, игровое время).
     */
    private readonly serverInfo = inject(ServerInformationService);

    /**
     * Сервис поселений (счётчик для пульса).
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис галереи скриншотов.
     */
    private readonly galleryService = inject(DiscordGalleryService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

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
    readonly pageSize = 2;

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
            header: 'home.carousel.slides.lastHearth.header',
            body: 'home.carousel.slides.lastHearth.body',
        },
        {
            image: `${this.imagesPath}/5.webp`,
            isLight: true,
            header: 'home.carousel.slides.hugeWorld.header',
            body: 'home.carousel.slides.hugeWorld.body',
        },
        {
            image: `${this.imagesPath}/2.webp`,
            isLight: true,
            header: 'home.carousel.slides.settlements.header',
            body: 'home.carousel.slides.settlements.body',
        },
        {
            image: `${this.imagesPath}/3.webp`,
            isLight: true,
            header: 'home.carousel.slides.sieges.header',
            body: 'home.carousel.slides.sieges.body',
        },
        {
            image: `${this.imagesPath}/4.webp`,
            isLight: false,
            header: 'home.carousel.slides.noPrivates.header',
            body: 'home.carousel.slides.noPrivates.body',
        },
        {
            image: `${this.imagesPath}/6.webp`,
            isLight: true,
            header: 'home.carousel.slides.navigation.header',
            body: 'home.carousel.slides.navigation.body',
        },
        {
            image: `${this.imagesPath}/7.webp`,
            isLight: true,
            header: 'home.carousel.slides.ownMods.header',
            body: 'home.carousel.slides.ownMods.body',
        },
        {
            image: `${this.imagesPath}/8.webp`,
            isLight: true,
            header: 'home.carousel.slides.fairRules.header',
            body: 'home.carousel.slides.fairRules.body',
        },
    ];

    /**
     * Быстрые действия на главной странице.
     * Помогают новому игроку сразу найти путь в мир.
     */
    protected readonly quickActions = [
        {
            icon: '@tui.play',
            label: 'home.quickActions.start',
            route: '/start-game',
            external: false,
        },
        {
            icon: '@tui.map',
            label: 'home.quickActions.settlements',
            route: '/settlements',
            external: false,
        },
        {
            icon: '@tui.image',
            label: 'home.quickActions.gallery',
            route: '/gallery',
            external: false,
        },
        {
            icon: '@tui.message-circle',
            label: 'home.quickActions.discord',
            route: 'https://discord.com/invite/FZb7SGrSFy',
            external: true,
        },
        {
            icon: '@tui.heart',
            label: 'home.quickActions.donate',
            route: '/market',
            external: false,
        },
    ];

    /**
     * Команда проекта.
     *
     * Роль задаётся ключом из `home.team.roles` и определяет
     * цветовое оформление карточки участника.
     *
     * Фото участников задаются в `environment.teamPhotos` по имени —
     * достаточно вставить ссылку на изображение.
     * Без фото отображается инициал на фирменном фоне.
     */
    protected readonly teamMembers: { name: string; role: TeamRole; pos: number }[] = [
        { name: 'Lisov', role: 'founder', pos: 1 },
        { name: 'Yonhva', role: 'coFounder', pos: 2 },
        { name: 'ripls', role: 'techAdmin', pos: 4 },
        { name: 'Sunhell', role: 'techAdmin', pos: 5 },
        { name: 'Hecker', role: 'admin', pos: 6 },
        { name: 'Mr.Suslik', role: 'admin', pos: 7 },
        { name: 'Myza', role: 'admin', pos: 3 },
        { name: 'Errora', role: 'admin', pos: 8 },
        { name: 'Anneta', role: 'admin', pos: 9 },
        { name: '_NickRim_', role: 'admin', pos: 10 },
        { name: 'Лягушка', role: 'moderator', pos: 11 },
        { name: 'Glifider', role: 'moderator', pos: 12 },
        { name: 'Minker', role: 'moderator', pos: 13 },
    ];

    /**
     * Возвращает URL фото участника команды из `environment.teamPhotos`.
     *
     * @param name Имя участника.
     * @returns URL фото или `undefined`, если фото не задано.
     */
    protected getTeamPhoto(name: string): string | undefined {
        return environment.teamPhotos[name] || undefined;
    }

    /**
     * Направления, по которым команда ищет людей.
     */
    protected readonly recruitRoles = [
        { icon: '@tui.shield', key: 'moderator' },
        { icon: '@tui.video', key: 'content' },
        { icon: '@tui.flame', key: 'events' },
        { icon: '@tui.users', key: 'promo' },
    ] as const;

    /**
     * Открывает диалог отправки тикета.
     */
    protected openTicket(): void {
        this.dialogs.open(new PolymorpheusComponent(TicketFormComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Текущий онлайн сервера.
     */
    protected readonly online = toSignal(
        this.serverInfo.getOnlinePlayersCount$().pipe(catchError(() => of(null))),
        { initialValue: null }
    );

    /**
     * Текущее игровое время мира (локализованное).
     */
    protected readonly worldTime = toSignal(
        this.serverInfo.getTime$().pipe(
            map((data) => formatServerTime(data.time, this.i18n.language())),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Количество одобренных поселений сервера.
     */
    protected readonly settlementsCount = toSignal(
        this.settlementService.getSettlements().pipe(
            map((list) => list.length),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Последние скриншоты из галереи для ленты на главной.
     */
    protected readonly galleryStrip = toSignal(
        this.galleryService.getAllImages$().pipe(
            map((images) => images.slice(0, 4)),
            catchError(() => of([]))
        ),
        { initialValue: [] }
    );

    /**
     * Возвращает CSS-классы бейджа роли участника команды.
     *
     * @param role Роль участника.
     * @returns Строка CSS-классов бейджа.
     */
    protected getTeamRoleBadgeClass(role: TeamRole): string {
        switch (role) {
            case 'founder':
                return 'bg-[#d4af37]/90 text-[#2d201a]';
            case 'coFounder':
                return 'bg-lh-accent/90 text-white';
            case 'techAdmin':
                return 'bg-[#3d5381]/90 text-[#f0e6d2]';
            case 'moderator':
                return 'bg-[#16a34a]/90 text-white';
            default:
                return 'bg-lh-danger/90 text-white';
        }
    }

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

                    return this.userService.getPlayersBatch$(authorIds).pipe(
                        map((players) => {
                            const playerMap = new Map(
                                players.map((player) => [player.user_id, player.user_game_name])
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
     * Флаг, указывающий, авторизован ли текущий пользователь.
     */
    readonly isAuthenticated = toSignal(this.userService.authState$, { initialValue: false });

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
                title: this.i18n.translate('home.news.deleteTitle'),
                text: this.i18n.translate('home.news.deleteText'),
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

}
