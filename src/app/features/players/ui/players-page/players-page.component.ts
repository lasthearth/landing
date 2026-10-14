import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    PLATFORM_ID,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, I18nService, TranslatePipe } from '@core/i18n';
import { buildSettlementMembers, SettlementMembership, SettlementService } from '@entities/settlement';
import { defaultPlayerLook, PlayerLook, PlayerLookService } from '@entities/player-style';
import {
    LastSeenFilter,
    parsePlayersQuery,
    PlayerListItem,
    PlayersApiService,
    PlayersPage,
    PlayersQuery,
    PlayerSort,
    PLAYERS_DEFAULT_QUERY,
    toPlayersQueryParams,
} from '@entities/user';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { PaginationComponent } from '@shared/ui/pagination';
import { SkeletonComponent } from '@shared/ui/skeletons';
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    map,
    of,
    startWith,
    Subject,
    switchMap,
} from 'rxjs';
import { PlayerCardComponent } from '../player-card/player-card.component';

/**
 * Пауза после последнего нажатия клавиши, прежде чем искать.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * С какого числа символов поиск имеет смысл.
 */
const MIN_SEARCH_LENGTH = 2;

/**
 * Сколько карточек-скелетонов показывать при загрузке.
 */
const SKELETON_CARDS = 6;

/**
 * Состояние списка игроков.
 */
type PlayersState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; page: PlayersPage };

/**
 * Страница «Игроки» `/players`: поиск по нику, фильтр «был в игре», сортировка
 * и нумерованные страницы.
 *
 * Всё состояние живёт в адресе (`?q=&seen=&sort=&page=`): это единственный
 * источник истины, поэтому «Назад» возвращает прошлый набор, а ссылкой
 * на подборку можно поделиться. Значения по умолчанию в адрес не пишутся.
 */
@Component({
    selector: 'app-players-page',
    imports: [
        AmountPipe,
        FormsModule,
        TranslatePipe,
        TuiIcon,
        LHInputComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        PageHeaderComponent,
        PaginationComponent,
        SkeletonComponent,
        PlayerCardComponent,
    ],
    templateUrl: './players-page.component.html',
    styleUrl: './players-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersPageComponent {
    private readonly api = inject(PlayersApiService);
    private readonly settlements = inject(SettlementService);
    private readonly looks = inject(PlayerLookService);
    private readonly router = inject(Router);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Фильтры «был в игре» в порядке кнопок.
     */
    protected readonly seenFilters: readonly LastSeenFilter[] = ['all', 'online', 'day', 'week', 'month', 'inactive'];

    /**
     * Порядки сортировки в порядке списка.
     */
    protected readonly sortValues: PlayerSort[] = ['seen', 'hours', 'name'];

    /**
     * Подпись порядка сортировки для выпадающего списка.
     *
     * @param sort Порядок сортировки.
     * @returns Переведённая подпись.
     */
    protected readonly sortLabel = (sort: PlayerSort): string => this.i18n.translate(`players.sort.${sort}`);

    /**
     * Карточки-скелетоны на время загрузки.
     */
    protected readonly skeletons = Array.from({ length: SKELETON_CARDS });

    /**
     * Кнопка «Повторить» после ошибки: перезапускает запрос с теми же параметрами.
     */
    private readonly reload$ = new BehaviorSubject<void>(undefined);

    /**
     * Начало списка — к нему прокручиваем после смены страницы.
     */
    private readonly listTop = viewChild<ElementRef<HTMLElement>>('listTop');

    /**
     * Текущий запрос: он же — параметры адреса.
     */
    protected readonly query = toSignal(this.route.queryParamMap.pipe(map((params) => parsePlayersQuery(params))), {
        initialValue: parsePlayersQuery(this.route.snapshot.queryParamMap),
    });

    /**
     * Состояние загрузки списка; при пререндере — скелетоны.
     */
    protected readonly state = toSignal(
        combineLatest([this.route.queryParamMap, this.reload$]).pipe(
            map(([params]) => parsePlayersQuery(params)),
            switchMap((query) =>
                !this.isBrowser
                    ? of<PlayersState>({ status: 'loading' })
                    : this.api.list$(query).pipe(
                          map((page): PlayersState => ({ status: 'ready', page })),
                          catchError(() => of<PlayersState>({ status: 'error' })),
                          startWith<PlayersState>({ status: 'loading' })
                      )
            )
        ),
        { initialValue: { status: 'loading' } as PlayersState }
    );

    /**
     * Загруженная страница списка.
     */
    protected readonly page = computed(() => {
        const state = this.state();

        return state.status === 'ready' ? state.page : null;
    });

    /**
     * Поселения игроков картой: один запрос на всю страницу.
     */
    private readonly memberships = toSignal(
        this.settlements.getSettlements().pipe(
            map((list) => buildSettlementMembers(list)),
            catchError(() => of(new Map<string, SettlementMembership>()))
        ),
        { initialValue: new Map<string, SettlementMembership>() }
    );

    /**
     * Оформление игроков страницы.
     */
    private readonly looksByUser = computed(() => {
        const looks = new Map<string, PlayerLook>();

        for (const player of this.page()?.players ?? []) {
            looks.set(player.userId, this.looks.lookOf(player.userId));
        }

        return looks;
    });

    /**
     * Строка поиска в поле.
     */
    protected readonly search = signal(this.query().query);

    /**
     * Набранный текст: запрос уходит после паузы.
     */
    private readonly searchInput$ = new Subject<string>();

    /**
     * Сколько страниц в текущем наборе.
     */
    protected readonly pages = computed(() => {
        const page = this.page();

        return page ? Math.max(1, Math.ceil(page.total / Math.max(1, page.pageSize))) : 1;
    });

    /**
     * Что-то выбрано помимо значений по умолчанию.
     */
    protected readonly hasFilters = computed(() => {
        const query = this.query();

        return (
            !!query.query ||
            query.lastSeen !== PLAYERS_DEFAULT_QUERY.lastSeen ||
            query.sort !== PLAYERS_DEFAULT_QUERY.sort
        );
    });

    public constructor() {
        this.searchInput$
            .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
            .subscribe((value) => this.applySearch(value));

        // «Назад» в браузере меняет адрес — поле поиска следует за ним.
        effect(() => {
            const query = this.query().query;

            untracked(() => this.search.set(query));
        });
    }

    /**
     * Показывает, сколько игроков подходит под фильтр; `null` — счётчики ещё не пришли.
     *
     * @param filter Фильтр «был в игре».
     * @returns Число игроков или `null`.
     */
    protected countOf(filter: LastSeenFilter): number | null {
        return this.page()?.counts[filter] ?? null;
    }

    /**
     * Поселение и роль игрока.
     *
     * @param player Игрок из списка.
     * @returns Поселение с ролью или `null`.
     */
    protected membershipOf(player: PlayerListItem): SettlementMembership | null {
        return this.memberships().get(player.userId) ?? null;
    }

    /**
     * Оформление игрока.
     *
     * @param player Игрок из списка.
     * @returns Вид: рамка аватара и анимация.
     */
    protected lookOf(player: PlayerListItem): PlayerLook {
        return this.looksByUser().get(player.userId) ?? defaultPlayerLook(null);
    }

    /**
     * Запоминает набранный текст и отправляет его на поиск после паузы.
     *
     * @param value Текст из поля поиска.
     */
    protected onSearchInput(value: string): void {
        this.search.set(value);
        this.searchInput$.next(value);
    }

    /**
     * Выбирает фильтр «был в игре» и возвращает список на первую страницу.
     *
     * @param filter Фильтр.
     */
    protected setSeen(filter: LastSeenFilter): void {
        if (filter !== this.query().lastSeen) {
            this.navigate({ lastSeen: filter, page: 1 });
        }
    }

    /**
     * Меняет порядок сортировки и возвращает список на первую страницу.
     *
     * @param sort Выбранный порядок сортировки.
     */
    protected setSort(sort: PlayerSort): void {
        if (sort !== this.query().sort) {
            this.navigate({ sort, page: 1 });
        }
    }

    /**
     * Переходит на другую страницу списка.
     *
     * @param page Номер страницы.
     */
    protected goToPage(page: number): void {
        this.navigate({ page });
        this.listTop()?.nativeElement.scrollIntoView({ block: 'start' });
    }

    /**
     * Сбрасывает поиск, фильтр и сортировку.
     */
    protected resetFilters(): void {
        this.search.set('');
        this.navigate({ query: '', lastSeen: PLAYERS_DEFAULT_QUERY.lastSeen, sort: PLAYERS_DEFAULT_QUERY.sort, page: 1 });
    }

    /**
     * Повторяет запрос после ошибки.
     */
    protected retry(): void {
        this.reload$.next();
    }

    /**
     * Отправляет поиск: не короче двух символов, с первой страницы.
     *
     * @param value Набранный текст.
     */
    private applySearch(value: string): void {
        const trimmed = value.trim();
        const query = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '';

        if (query !== this.query().query) {
            this.navigate({ query, page: 1 }, true);
        }
    }

    /**
     * Пишет состояние в адрес страницы.
     *
     * @param patch Что изменить в текущем запросе.
     * @param replace Заменить текущую запись истории вместо новой (набор текста).
     */
    private navigate(patch: Partial<PlayersQuery>, replace = false): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: toPlayersQueryParams({ ...this.query(), ...patch }),
            replaceUrl: replace,
        });
    }
}
