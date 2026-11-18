import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    SettlementService,
    ISettlement,
    getSettlementTypeName,
    getSettlementDisplayName,
    isGuildSettlement,
} from '@entities/settlement';
import { IPlayer, UserService } from '@entities/user';
import { SettlementTagStore } from '@entities/settlement-tag';
import { MyJoinRequestsStore } from './join-request';
import { SettlementCardComponent } from './settlement-card/settlement-card.component';
import { SettlementCardSkeletonComponent } from '@shared/ui/skeletons';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { SettlementFinderService } from './settlement-finder/settlement-finder.service';
import { RevealDirective } from '@shared/lib/directives';

/**
 * Поле сортировки списка селений.
 */
type SortField = 'default' | 'population' | 'online' | 'diplomacy';

/**
 * Направление сортировки.
 */
type SortDirection = 'asc' | 'desc';

/**
 * Обогащённые данные надела для сортировки.
 */
interface EnrichedSettlement extends ISettlement {
    membersCount: number;
    onlineCount: number;

    /**
     * Профили лидера и участников надела, загруженные одним батчем на страницу.
     */
    players: IPlayer[];
}

/**
 * Имя надела, которое всегда отображается первым в списке.
 */
const PINNED_SETTLEMENT_NAME = 'Поместье Эренхольд';

/**
 * Отображаемый тип для закреплённого надела.
 */
const PINNED_SETTLEMENT_TYPE_LABEL = 'Поместье наместника';

/**
 * Компонент страницы списка селений.
 */
@Component({
    selector: 'app-settlements',
    imports: [PageHeaderComponent,
        RouterLink,
        SettlementCardComponent,
        SettlementCardSkeletonComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        TranslatePipe,
        TuiIcon,
        RevealDirective,
    ],
    templateUrl: './settlements.component.html',
    styleUrl: './settlements.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(window:scroll)': 'closeMenu()',
        '(window:resize)': 'closeMenu()',
    },
})
export class SettlementsComponent {
    /**
     * Имя надела, закреплённого в начале списка.
     */
    protected readonly pinnedSettlementName = PINNED_SETTLEMENT_NAME;

    /**
     * Отображаемый тип закреплённого надела.
     */
    protected readonly pinnedSettlementTypeLabel = PINNED_SETTLEMENT_TYPE_LABEL;

    protected readonly skeletonItems = Array.from({ length: 3 });
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);
    private readonly tagStore = inject(SettlementTagStore);
    private readonly i18n = inject(I18nService);

    /**
     * Инжектор для afterNextRender вне контекста инжекции.
     */
    private readonly injector = inject(Injector);

    /**
     * Хранилище собственных заявок игрока на вступление.
     * Загружается один раз на страницу и раздаётся карточкам.
     */
    private readonly joinRequests = inject(MyJoinRequestsStore);

    protected readonly loading = signal<boolean>(false);
    protected readonly error = signal<boolean>(false);
    protected readonly sortState = signal<{ field: SortField; direction: SortDirection }>({
        field: 'default',
        direction: 'desc',
    });

    private readonly enrichedSettlements = signal<EnrichedSettlement[]>([]);

    /**
     * Роутер — фильтры хранятся в адресе (?q=&type=&course=), чтобы ссылкой можно было поделиться.
     */
    private readonly router = inject(Router);

    /**
     * Текущий маршрут.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * Ключ открытого списка панели: sort, filters или null — всё закрыто.
     */
    protected readonly openMenu = signal<'sort' | 'filters' | null>(null);

    /**
     * Координаты открытого поповера: fixed-позиционирование от кнопки.
     */
    protected readonly popStyle = signal<Record<string, string>>({});

    /**
     * Открыт ли поповер вверх от кнопки: мало места снизу.
     */
    protected readonly popFlipped = signal(false);

    /**
     * Элемент открытого поповера: замер высоты для переворота.
     */
    private readonly popEl = viewChild<ElementRef<HTMLElement>>('pop');

    /**
     * Кнопки-триггеры поповеров: позиция считается от их прямоугольника.
     */
    private readonly sortTrigger = viewChild<ElementRef<HTMLButtonElement>>('sortTrigger');
    private readonly filtersTrigger = viewChild<ElementRef<HTMLButtonElement>>('filtersTrigger');

    /**
     * Подсказка кнопки направления сортировки.
     */
    protected readonly directionTitle = computed(() =>
        this.i18n.translate(this.sortState().direction === 'asc' ? 'settlements.list.sortAsc' : 'settlements.list.sortDesc'),
    );

    /**
     * Число активных фильтров для значка на кнопке.
     */
    protected readonly activeFilters = computed(() => (this.typeFilter() ? 1 : 0) + (this.courseFilter() ? 1 : 0));

    /**
     * Поисковая строка: название надела или ник жителя.
     */
    protected readonly query = signal<string>(this.route.snapshot.queryParamMap.get('q') ?? '');

    /**
     * Выбранный тип надела (подпись типа) или null — все.
     */
    protected readonly typeFilter = signal<string | null>(this.route.snapshot.queryParamMap.get('type'));

    /**
     * Выбранный дипломатический курс или null — все.
     */
    protected readonly courseFilter = signal<string | null>(this.route.snapshot.queryParamMap.get('course'));

    /**
     * Типы, которые есть в списке, с количеством.
     */
    protected readonly typeOptions = computed(() => this.countBy((item) => this.getSettlementTypeLabel(item)));

    /**
     * Курсы, которые есть в списке, с количеством.
     */
    protected readonly courseOptions = computed(() =>
        this.countBy((item) => (isGuildSettlement(item) ? '' : item.diplomacy)).filter((option) => option.value)
    );

    /**
     * Включён ли хоть один фильтр.
     */
    protected readonly hasFilters = computed(() => !!this.query().trim() || !!this.typeFilter() || !!this.courseFilter());

    /**
     * Наделы после сортировки и фильтров.
     */
    protected readonly filteredSettlements = computed(() => {
        const query = this.query().trim().toLowerCase();
        const type = this.typeFilter();
        const course = this.courseFilter();

        return this.sortedSettlements().filter((item) => {
            if (type && this.getSettlementTypeLabel(item) !== type) {
                return false;
            }

            // Политического курса у гильдии нет: фильтр курса её не касается.
            if (course && !isGuildSettlement(item) && item.diplomacy !== course) {
                return false;
            }

            if (!query) {
                return true;
            }

            return (
                getSettlementDisplayName(item).toLowerCase().includes(query) ||
                item.players.some((player) => player.user_game_name?.toLowerCase().includes(query))
            );
        });
    });

    /**
     * Отсортированный список селений.
     */
    protected readonly sortedSettlements = computed(() => {
        const list = [...this.enrichedSettlements()];
        const { field, direction } = this.sortState();
        const dir = direction === 'asc' ? 1 : -1;

        const pinnedIndex = list.findIndex((s) => getSettlementDisplayName(s) === PINNED_SETTLEMENT_NAME);
        const pinned = pinnedIndex >= 0 ? list.splice(pinnedIndex, 1)[0] : null;

        let sorted: EnrichedSettlement[];

        switch (field) {
            case 'population':
                sorted = list.sort((a, b) => dir * (a.membersCount - b.membersCount));
                break;
            case 'online':
                sorted = list.sort((a, b) => dir * (a.onlineCount - b.onlineCount));
                break;
            case 'diplomacy':
                sorted = list.sort((a, b) => dir * a.diplomacy.localeCompare(b.diplomacy));
                break;
            default:
                sorted = list;
        }

        return pinned ? [pinned, ...sorted] : sorted;
    });

    constructor() {
        this.tagStore.loadTags$().subscribe();
        this.joinRequests.load();
        this.loadSettlements();
    }

    /**
     * Загружает список селений вместе с профилями всех участников.
     *
     * Профили запрашиваются одним батчем на всю страницу, поэтому счётчик
     * онлайна и списки жителей готовы сразу, без запроса на каждую карточку.
     */
    protected loadSettlements(): void {
        this.loading.set(true);
        this.error.set(false);
        forkJoin({
            settlements: this.settlementService.getSettlements(),
            guilds: this.settlementService.getGuilds().pipe(catchError(() => of([] as ISettlement[]))),
        })
            .pipe(
                map(({ settlements, guilds }) => [...(settlements ?? []), ...guilds]),
                switchMap((list) =>
                    this.userService
                        .getPlayersBatch$(
                            list.flatMap((s) => s.members.map((m) => m.user_id))
                        )
                        .pipe(
                            catchError((error) => {
                                console.error('[Settlements] Ошибка загрузки участников:', error);
                                return of([] as IPlayer[]);
                            }),
                            map((players) => ({ list, players }))
                        )
                ),
                catchError(() => {
                    this.error.set(true);
                    return of({ list: [] as ISettlement[], players: [] as IPlayer[] });
                })
            )
            .subscribe(({ list, players }) => {
                const playerById = new Map(players.map((player) => [player.user_id, player]));

                this.enrichedSettlements.set(
                    list.map((s) => {
                        const settlementPlayers = s.members
                            .map((m) => m.user_id)
                            .map((id) => playerById.get(id))
                            .filter((player): player is IPlayer => player !== undefined);

                        return {
                            ...s,
                            membersCount: s.members.length,
                            onlineCount: settlementPlayers.filter((player) => player.is_online).length,
                            players: settlementPlayers,
                        };
                    })
                );
                this.loading.set(false);
            });
    }

    /**
     * Меняет поисковую строку.
     *
     * @param event Событие ввода.
     */
    protected onQueryInput(event: Event): void {
        this.setQuery((event.target as HTMLInputElement).value);
    }

    /**
     * Включает или снимает фильтр по типу.
     *
     * @param value Подпись типа.
     */
    protected toggleType(value: string): void {
        this.withReorder(() => {
            this.typeFilter.set(this.typeFilter() === value ? null : value);
            this.syncQueryParams();
        });
    }

    /**
     * Включает или снимает фильтр по курсу.
     *
     * @param value Курс.
     */
    protected toggleCourse(value: string): void {
        this.withReorder(() => {
            this.courseFilter.set(this.courseFilter() === value ? null : value);
            this.syncQueryParams();
        });
    }

    /**
     * Сбрасывает поиск и фильтры.
     */
    protected resetFilters(): void {
        this.withReorder(() => {
            this.query.set('');
            this.typeFilter.set(null);
            this.courseFilter.set(null);
            this.syncQueryParams();
        });
    }

    /**
     * Пишет фильтры в адрес страницы без новой записи в истории.
     */
    private syncQueryParams(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                q: this.query().trim() || null,
                type: this.typeFilter(),
                course: this.courseFilter(),
            },
            replaceUrl: true,
        });
    }

    /**
     * Группирует надела по значению и считает их.
     *
     * @param pick Функция, извлекающая значение.
     */
    private countBy(pick: (item: EnrichedSettlement) => string): { value: string; count: number }[] {
        const counts = new Map<string, number>();

        for (const item of this.enrichedSettlements()) {
            const value = pick(item);
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }

        return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
    }

    /**
     * Повторно загружает список селений после ошибки.
     */
    protected retryLoad(): void {
        this.loadSettlements();
    }

    /**
     * Подбор надела по ответам игрока.
     */
    private readonly finder = inject(SettlementFinderService);

    /**
     * Открывает «Подбери надел».
     */
    protected openFinder(): void {
        this.finder.open().subscribe();
    }

    /**
     * Ключи сортировки в порядке кнопок.
     */
    protected readonly sortKeys: readonly SortField[] = ['default', 'population', 'online', 'diplomacy'];

    /**
     * Устанавливает поле сортировки. При повторном нажатии меняет направление.
     *
     * @param field Поле сортировки.
     */
    protected setSort(field: SortField): void {
        this.withReorder(() => {
            const current = this.sortState();
            if (current.field === field) {
                this.sortState.set({
                    field,
                    direction: current.direction === 'desc' ? 'asc' : 'desc',
                });
            } else {
                this.sortState.set({ field, direction: 'desc' });
            }
        });
    }

    /**
     * Возвращает признак активности кнопки сортировки.
     *
     * @param field Поле сортировки.
     */
    protected isSortActive(field: SortField): boolean {
        return this.sortState().field === field;
    }

    /**
     * Возвращает направление сортировки для отображения треугольника.
     *
     * @param field Поле сортировки.
     */
    protected getSortDirection(field: SortField): SortDirection | null {
        return this.sortState().field === field ? this.sortState().direction : null;
    }

    /**
     * Меняет направление сортировки текущего поля.
     */
    protected flipSort(): void {
        this.withReorder(() => {
            const current = this.sortState();
            this.sortState.set({ field: current.field, direction: current.direction === 'desc' ? 'asc' : 'desc' });
        });
    }

    /**
     * Контейнер сетки карточек: позиции меряем по живому DOM в порядке списка.
     */
    private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

    /**
     * Прямоугольники карточек до перестановки; null — анимация не нужна.
     */
    private flipBefore: Map<string, DOMRect> | null = null;

    /**
     * Применяет изменение списка и проигрывает переезд карточек (FLIP).
     * Замеры до мутации и проигрывание на следующем кадре, когда список уже перерисован.
     *
     * @param apply Мутация сортировки или фильтров.
     */
    private withReorder(apply: () => void): void {
        this.captureRects();
        apply();
        afterNextRender(() => this.playReorderFlip(), { injector: this.injector });
    }

    /**
     * Запоминает позиции карточек текущего списка по id надела.
     */
    private captureRects(): void {
        const rects = new Map<string, DOMRect>();

        this.cardNodes().forEach((el, index) => {
            const item = this.filteredSettlements()[index];

            if (item) {
                rects.set(item.id, el.getBoundingClientRect());
            }
        });

        this.flipBefore = rects;
    }

    /**
     * Хосты карточек из DOM в порядке списка.
     *
     * @returns Массив элементов app-settlement-card.
     */
    private cardNodes(): HTMLElement[] {
        const grid = this.gridEl()?.nativeElement;
        return grid ? [...grid.querySelectorAll<HTMLElement>(':scope > app-settlement-card')] : [];
    }

    /**
     * Переводит карточки со старых позиций на новые: инверсия сдвигом и проигрывание
     * токенами движения страницы. При prefers-reduced-motion — мягкое проявление вместо полёта.
     */
    private playReorderFlip(): void {
        const before = this.flipBefore;
        this.flipBefore = null;

        if (!before || before.size === 0) {
            return;
        }

        const style = getComputedStyle(document.documentElement);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.cardNodes().forEach((el, index) => {
            const item = this.filteredSettlements()[index];
            const old = item ? before.get(item.id) : undefined;

            if (!old) {
                return;
            }

            if (reduce) {
                const fade = parseInt(style.getPropertyValue('--lh-dur-exit'), 10) || 150;
                el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: fade });
                return;
            }

            const now = el.getBoundingClientRect();
            const dx = old.left - now.left;
            const dy = old.top - now.top;

            if (Math.abs(dx) + Math.abs(dy) < 1) {
                return;
            }

            const duration = parseInt(style.getPropertyValue('--lh-dur-fast'), 10) || 200;
            const easing = style.getPropertyValue('--lh-ease-move').trim() || 'ease-in-out';
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing });
        });
    }

    /**
     * Меняет поисковую строку и адрес страницы.
     *
     * @param value Строка поиска.
     */
    protected setQuery(value: string): void {
        this.query.set(value);
        this.syncQueryParams();
    }

    /**
     * Открывает указанный список панели и закрывает соседний.
     *
     * @param menu Ключ списка.
     */
    protected toggleMenu(menu: 'sort' | 'filters'): void {
        if (this.openMenu() === menu) {
            this.closeMenu();
            return;
        }

        const trigger = (menu === 'sort' ? this.sortTrigger() : this.filtersTrigger())?.nativeElement;

        if (!trigger) {
            return;
        }

        this.openMenu.set(menu);
        this.placePop(trigger);
    }

    /**
     * Закрывает открытый список панели по клику на подложку, прокрутке или ресайзу:
     * поповер позиционирован от кнопки и при сдвиге страницы обязан уйти.
     */
    protected closeMenu(): void {
        this.openMenu.set(null);
        this.popStyle.set({});
        this.popFlipped.set(false);
    }

    /**
     * Ставит поповер под кнопку-триггер, а при нехватке места снизу — над неё.
     * Нижний предел учитывает полосу согласия, чтобы поповер не прятался под ней.
     *
     * @param trigger Кнопка, от которой открыт поповер.
     */
    private placePop(trigger: HTMLElement): void {
        const gap = 8;
        const rect = trigger.getBoundingClientRect();
        const consent = document.body.classList.contains('lh-has-consent')
            ? parseInt(getComputedStyle(document.body).getPropertyValue('--lh-consent-h'), 10) || 0
            : 0;
        const floor = window.innerHeight - gap - consent;
        const right = `${window.innerWidth - rect.right}px`;
        this.popFlipped.set(false);
        this.popStyle.set({ top: `${rect.bottom + gap}px`, right, bottom: 'auto', left: 'auto' });

        afterNextRender(() => {
            const pop = this.popEl()?.nativeElement;

            if (!pop || this.openMenu() === null) {
                return;
            }

            /* offsetHeight, а не rect: входной scale(0.96) занижает замер. */
            const height = pop.offsetHeight;

            if (rect.bottom + gap + height <= floor) {
                return;
            }

            if (rect.top - gap - height >= gap) {
                this.popFlipped.set(true);
                this.popStyle.set({ top: 'auto', right, bottom: `${window.innerHeight - rect.top + gap}px`, left: 'auto' });
                return;
            }

            /* Не влезает ни снизу, ни сверху: прижать к нижнему пределу. */
            this.popStyle.set({ top: `${floor - height}px`, right, bottom: 'auto', left: 'auto' });
        }, { injector: this.injector });
    }

    /**
     * Выбирает поле сортировки из списка и закрывает список.
     *
     * @param field Поле сортировки.
     */
    protected pickSort(field: SortField): void {
        this.setSort(field);
        this.closeMenu();
    }

    /**
     * Проверяет, является ли надел закреплённым.
     *
     * @param settlement Надел.
     * @returns true, если надел — Поместье Эренхольд.
     */
    protected isPinned(settlement: ISettlement): boolean {
        return getSettlementDisplayName(settlement) === PINNED_SETTLEMENT_NAME;
    }

    /**
     * Возвращает отображаемый тип надела.
     * Для закреплённого надела всегда возвращает "Поместье наместника".
     *
     * @param settlement Надел.
     * @returns Локализованное название типа.
     */
    protected getSettlementTypeLabel(settlement: EnrichedSettlement): string {
        if (this.isPinned(settlement)) {
            return PINNED_SETTLEMENT_TYPE_LABEL;
        }

        if (isGuildSettlement(settlement)) {
            return this.i18n.translate('settlements.types.guild');
        }

        return getSettlementTypeName(settlement);
    }
}
