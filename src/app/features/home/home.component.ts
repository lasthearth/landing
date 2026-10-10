import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import { NewsCardComponent } from '@app/features/news/ui/news-card/news-card.component';
import { NewsSkeletonComponent } from '@app/features/news/ui/news-skeleton/news-skeleton.component';
import { NewsApiService, mapDtoToNews } from '@entities/news';
import { UserService, Role } from '@entities/user';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import { ServerInformationService } from '@core/services/server-information.service';
import { SettlementService } from '@entities/settlement';
import { DiscordGalleryService } from '@shared/lib/discord-gallery/discord-gallery.service';
import { formatServerTime } from '@app/layout/header/lib/format-server-time.function';
import { catchError, finalize, map, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@shared/lib/directives';
import { PulseStat } from './model/pulse-stat.interface';
import { UpcomingEventComponent } from '@features/events';

/**
 * Компонент главной страницы.
 */
@Component({
    standalone: true,
    selector: 'app-home',
    imports: [TuiCarousel, NewsCardComponent, NewsSkeletonComponent, TuiPagination, TuiIcon, RouterLink, ImageLoaderComponent, TranslatePipe, RevealDirective, UpcomingEventComponent],
    styleUrl: './home.component.less',
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
    /**
     * Ссылка-приглашение на Discord-сервер проекта.
     */
    protected readonly discordInviteUrl: string = environment.discordInviteUrl;

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
     * Признак авторизованного пользователя.
     * Для вошедших игроков карусель-приветствие скрывается: она нужна как
     * презентация проекта новым посетителям, а не как часть рабочего экрана.
     */
    protected readonly isAuthed = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Номер элемента карусели.
     */
    protected carouselIndex: number = 0;

    /**
     * Пауза карусели, включённая пользователем кнопкой.
     */
    protected readonly carouselPaused = signal(false);

    /**
     * Курсор или фокус клавиатуры внутри карусели — автопрокрутка на это время останавливается.
     */
    protected readonly carouselHovered = signal(false);

    /**
     * Интервал автопрокрутки карусели в мс. 0 у Taiga отключает автопрокрутку.
     */
    protected readonly carouselDuration = computed(() => (this.carouselPaused() || this.carouselHovered() ? 0 : 7000));

    /**
     * Сколько новостей показано сразу: главная и две под ней.
     */
    private static readonly INITIAL_NEWS_COUNT = 3;

    /**
     * Сколько новостей добавляет кнопка «Показать ещё»: два ряда по две.
     */
    private static readonly NEWS_STEP = 4;

    /**
     * Сколько новостей сейчас показано (включая главную).
     */
    protected readonly visibleNewsCount = signal(HomeComponent.INITIAL_NEWS_COUNT);

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
     * Быстрые действия на главной странице — только то, чего нет в меню.
     *
     * Гость их не видит: «Начать играть» и Discord стоят прямо на карусели.
     * Авторизованному игроку — короткий путь к IP сервера (он в профиле,
     * `/profile/how-play`) и приглашение в Discord. Поселения, галерея
     * и магазин убраны: они уже есть в главном меню.
     */
    protected readonly quickActions = computed(() =>
        this.isAuthed()
            ? [
                  {
                      icon: '@tui.globe',
                      label: 'home.quickActions.whereIp',
                      route: '/profile/how-play',
                      external: false,
                  },
                  {
                      icon: '@tui.message-circle',
                      label: 'home.quickActions.discord',
                      route: environment.discordInviteUrl,
                      external: true,
                  },
              ]
            : []
    );

    /**
     * Сколько слайдов карусели держать загруженными по обе стороны от текущего.
     * Остальные не рендерят картинку: `loading="lazy"` внутри горизонтальной
     * прокрутки не срабатывает, и раньше страница тянула все 8 слайдов по 1920px.
     */
    private static readonly CAROUSEL_PRELOAD = 1;

    /**
     * Нужно ли рендерить картинку слайда: текущий и соседние (с учётом зацикливания).
     *
     * @param index Индекс слайда.
     * @returns true, если слайд текущий или соседний.
     */
    protected isSlideNear(index: number): boolean {
        const total = this.images.length;
        const distance = Math.abs(index - this.carouselIndex);

        return Math.min(distance, total - distance) <= HomeComponent.CAROUSEL_PRELOAD;
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
     * Метрики «Пульса сервера» для отрисовки одним циклом.
     * Собраны в один список, чтобы три идентичные карточки не дублировались
     * в шаблоне: расходились подписи и разметка при каждой правке.
     */
    protected readonly pulseStats = computed<readonly PulseStat[]>(() => [
        { icon: '@tui.users', labelKey: 'home.pulse.online', value: this.online()?.online ?? null },
        { icon: '@tui.clock', labelKey: 'home.pulse.worldTime', value: this.worldTime() },
        { icon: '@tui.castle', labelKey: 'home.pulse.settlements', value: this.settlementsCount() },
    ]);

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
     * Якорь из адреса: `/#news` открывает главную сразу на блоке новостей
     * (ссылка «Все новости» со страницы новости).
     */
    private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Прокручивает к блоку новостей, когда они загрузились и в адресе есть `#news`.
     * Ждём загрузки, иначе скелетоны и карусель сдвинут блок после прокрутки.
     */
    private readonly scrollToNews = effect(() => {
        if (!this.isBrowser || this.fragment() !== 'news' || this.loading()) {
            return;
        }

        requestAnimationFrame(() => document.getElementById('news')?.scrollIntoView({ block: 'start' }));
    });

    /**
     * Новости от новых к старым; новости без даты — в конце.
     */
    protected readonly sortedNews = computed(() =>
        [...this.news()].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    );

    /**
     * Главная (самая свежая) новость — крупная карточка на всю ширину.
     */
    protected readonly featuredNews = computed(() => this.sortedNews()[0] ?? null);

    /**
     * Остальные показанные новости — сетка в две колонки под главной.
     */
    protected readonly restNews = computed(() => this.sortedNews().slice(1, this.visibleNewsCount()));

    /**
     * Сколько новостей ещё скрыто за кнопкой «Показать ещё».
     */
    protected readonly hiddenNewsCount = computed(() =>
        Math.max(0, this.sortedNews().length - this.visibleNewsCount())
    );

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
     * Показывает следующую порцию новостей.
     */
    protected showMoreNews(): void {
        this.visibleNewsCount.update((count) => count + HomeComponent.NEWS_STEP);
    }

    /**
     * Удаляет новость по идентификатору.
     *
     * Вызывается карточкой новости уже после подтверждения пользователем.
     * После успешного удаления обновляет список новостей.
     *
     * @param id Идентификатор новости для удаления.
     */
    protected deleteNews(id: string): void {
        // Подтверждение уже показала карточка новости (NewsCardComponent.onDeleteClick);
        // второй диалог здесь заставлял подтверждать удаление дважды.
        this.api
            .delete(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.refresh$.next();
                },
                error: (err) => {
                    console.error('[News] Ошибка удаления новости:', err);
                },
            });
    }

}
