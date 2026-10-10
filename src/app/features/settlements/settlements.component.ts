import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    SettlementService,
    ISettlement,
    getSettlementTypeByKey,
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
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { SettlementFinderService } from './settlement-finder/settlement-finder.service';

/**
 * Поле сортировки списка селений.
 */
type SortField = 'default' | 'population' | 'online' | 'diplomacy';

/**
 * Направление сортировки.
 */
type SortDirection = 'asc' | 'desc';

/**
 * Обогащённые данные селения для сортировки.
 */
interface EnrichedSettlement extends ISettlement {
    membersCount: number;
    onlineCount: number;

    /**
     * Профили лидера и участников селения, загруженные одним батчем на страницу.
     */
    players: IPlayer[];
}

/**
 * Имя селения, которое всегда отображается первым в списке.
 */
const PINNED_SETTLEMENT_NAME = 'Поместье Эренхольд';

/**
 * Отображаемый тип для закреплённого селения.
 */
const PINNED_SETTLEMENT_TYPE_LABEL = 'Поместье наместника';

/**
 * Компонент страницы списка селений.
 */
@Component({
    selector: 'app-settlements',
    imports: [PageHeaderComponent, 
        SettlementCardComponent,
        SettlementCardSkeletonComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        TranslatePipe,
        TuiIcon,
    ],
    templateUrl: './settlements.component.html',
    styleUrl: './settlements.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementsComponent {
    /**
     * Имя селения, закреплённого в начале списка.
     */
    protected readonly pinnedSettlementName = PINNED_SETTLEMENT_NAME;

    /**
     * Отображаемый тип закреплённого селения.
     */
    protected readonly pinnedSettlementTypeLabel = PINNED_SETTLEMENT_TYPE_LABEL;

    protected readonly skeletonItems = Array.from({ length: 3 });
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);
    private readonly tagStore = inject(SettlementTagStore);
    private readonly i18n = inject(I18nService);

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
     * Поисковая строка: название поселения или ник жителя.
     */
    protected readonly query = signal<string>(this.route.snapshot.queryParamMap.get('q') ?? '');

    /**
     * Выбранный тип поселения (подпись типа) или null — все.
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
    protected readonly courseOptions = computed(() => this.countBy((item) => item.diplomacy).filter((option) => option.value));

    /**
     * Включён ли хоть один фильтр.
     */
    protected readonly hasFilters = computed(() => !!this.query().trim() || !!this.typeFilter() || !!this.courseFilter());

    /**
     * Поселения после сортировки и фильтров.
     */
    protected readonly filteredSettlements = computed(() => {
        const query = this.query().trim().toLowerCase();
        const type = this.typeFilter();
        const course = this.courseFilter();

        return this.sortedSettlements().filter((item) => {
            if (type && this.getSettlementTypeLabel(item) !== type) {
                return false;
            }

            if (course && item.diplomacy !== course) {
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
        this.settlementService
            .getSettlements()
            .pipe(
                map((s) => (s === null ? [] : s)),
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
        this.query.set((event.target as HTMLInputElement).value);
        this.syncQueryParams();
    }

    /**
     * Включает или снимает фильтр по типу.
     *
     * @param value Подпись типа.
     */
    protected toggleType(value: string): void {
        this.typeFilter.set(this.typeFilter() === value ? null : value);
        this.syncQueryParams();
    }

    /**
     * Включает или снимает фильтр по курсу.
     *
     * @param value Курс.
     */
    protected toggleCourse(value: string): void {
        this.courseFilter.set(this.courseFilter() === value ? null : value);
        this.syncQueryParams();
    }

    /**
     * Сбрасывает поиск и фильтры.
     */
    protected resetFilters(): void {
        this.query.set('');
        this.typeFilter.set(null);
        this.courseFilter.set(null);
        this.syncQueryParams();
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
     * Группирует поселения по значению и считает их.
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
     * Подбор поселения по ответам игрока.
     */
    private readonly finder = inject(SettlementFinderService);

    /**
     * Открывает «Подбери поселение».
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
        const current = this.sortState();
        if (current.field === field) {
            this.sortState.set({
                field,
                direction: current.direction === 'desc' ? 'asc' : 'desc',
            });
        } else {
            this.sortState.set({ field, direction: 'desc' });
        }
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
     * Проверяет, является ли селение закреплённым.
     *
     * @param settlement Селение.
     * @returns true, если селение — Поместье Эренхольд.
     */
    protected isPinned(settlement: ISettlement): boolean {
        return getSettlementDisplayName(settlement) === PINNED_SETTLEMENT_NAME;
    }

    /**
     * Возвращает отображаемый тип селения.
     * Для закреплённого селения всегда возвращает "Поместье наместника".
     *
     * @param settlement Селение.
     * @returns Локализованное название типа.
     */
    protected getSettlementTypeLabel(settlement: EnrichedSettlement): string {
        if (this.isPinned(settlement)) {
            return PINNED_SETTLEMENT_TYPE_LABEL;
        }

        if (isGuildSettlement(settlement)) {
            return this.i18n.translate('settlements.types.guild');
        }

        return getSettlementTypeByKey(settlement.type);
    }
}
