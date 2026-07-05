import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SettlementService, ISettlement, getSettlementTypeByKey } from '@entities/settlement';
import { UserService } from '@entities/user';
import { SettlementTagStore } from '@entities/settlement-tag';
import { SettlementCardComponent } from './settlement-card/settlement-card.component';
import { SettlementCardSkeletonComponent } from '@shared/ui/skeletons';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { from, mergeMap, of, toArray } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TranslatePipe } from '@core/i18n';

/**
 * Поле сортировки списка селений.
 */
type SortField = 'default' | 'population' | 'online' | 'east' | 'west' | 'suzerain' | 'diplomacy';

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
    tagTypes: Set<string>;
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
    imports: [SettlementCardComponent, SettlementCardSkeletonComponent, EmptyStateComponent, ErrorStateComponent, TranslatePipe],
    templateUrl: './settlements.component.html',
    styleUrl: './settlements.component.css',
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

    protected readonly loading = signal<boolean>(false);
    protected readonly loadingOnline = signal<boolean>(false);
    protected readonly error = signal<boolean>(false);
    protected readonly sortState = signal<{ field: SortField; direction: SortDirection }>({
        field: 'default',
        direction: 'desc',
    });

    private readonly rawSettlements = signal<ISettlement[]>([]);
    private readonly enrichedSettlements = signal<EnrichedSettlement[]>([]);

    /**
     * Отсортированный список селений.
     */
    protected readonly sortedSettlements = computed(() => {
        const list = [...this.enrichedSettlements()];
        const { field, direction } = this.sortState();
        const dir = direction === 'asc' ? 1 : -1;

        const pinnedIndex = list.findIndex((s) => s.name === PINNED_SETTLEMENT_NAME);
        const pinned = pinnedIndex >= 0 ? list.splice(pinnedIndex, 1)[0] : null;

        let sorted: EnrichedSettlement[];

        switch (field) {
            case 'population':
                sorted = list.sort((a, b) => dir * (a.membersCount - b.membersCount));
                break;
            case 'online':
                sorted = list.sort((a, b) => dir * (a.onlineCount - b.onlineCount));
                break;
            case 'east':
                sorted = list.sort((a, b) => dir * ((a.tagTypes.has('east') ? 1 : 0) - (b.tagTypes.has('east') ? 1 : 0)));
                break;
            case 'west':
                sorted = list.sort((a, b) => dir * ((a.tagTypes.has('west') ? 1 : 0) - (b.tagTypes.has('west') ? 1 : 0)));
                break;
            case 'suzerain':
                sorted = list.sort((a, b) => dir * ((a.tagTypes.has('suzerain') ? 1 : 0) - (b.tagTypes.has('suzerain') ? 1 : 0)));
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
        this.loadSettlements();
    }

    /**
     * Загружает список селений и обогащает базовыми данными.
     */
    protected loadSettlements(): void {
        this.loading.set(true);
        this.error.set(false);
        this.settlementService
            .getSettlements()
            .pipe(
                map((s) => (s === null ? [] : s)),
                catchError(() => {
                    this.error.set(true);
                    return of([]);
                })
            )
            .subscribe((list) => {
                this.rawSettlements.set(list);
                this.enrichedSettlements.set(
                    list.map((s) => ({
                        ...s,
                        membersCount: s.members.length + 1,
                        onlineCount: 0,
                        tagTypes: this.getSpecialTagTypes(s.tags),
                    }))
                );
                this.loading.set(false);
            });
    }

    /**
     * Повторно загружает список селений после ошибки.
     */
    protected retryLoad(): void {
        this.loadSettlements();
    }

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
        if (field === 'online') {
            this.ensureOnlineLoaded();
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

    private onlineLoaded = false;

    /**
     * Возвращает набор системных типов тегов, присутствующих у поселения.
     *
     * @param tags Список ссылок на теги поселения.
     * @returns Набор строковых ключей системных типов.
     */
    private getSpecialTagTypes(tags: { id: string }[]): Set<string> {
        const types = new Set<string>();

        if (this.tagStore.hasSpecialTag(tags, 'east')) {
            types.add('east');
        }
        if (this.tagStore.hasSpecialTag(tags, 'west')) {
            types.add('west');
        }
        if (this.tagStore.hasSpecialTag(tags, 'suzerain')) {
            types.add('suzerain');
        }

        return types;
    }

    /**
     * Проверяет, является ли селение закреплённым.
     *
     * @param settlement Селение.
     * @returns true, если селение — Поместье Эренхольд.
     */
    protected isPinned(settlement: ISettlement): boolean {
        return settlement.name === PINNED_SETTLEMENT_NAME;
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

        return getSettlementTypeByKey(settlement.type);
    }

    /**
     * Загружает онлайн-статусы всех участников селений.
     * Выполняется один раз при первом выборе сортировки по онлайну.
     */
    private ensureOnlineLoaded(): void {
        if (this.onlineLoaded || this.loadingOnline()) {
            return;
        }
        if (!this.userService.userId) {
            this.onlineLoaded = true;
            return;
        }
        this.loadingOnline.set(true);

        const allUserIds = [
            ...new Set(
                this.rawSettlements().flatMap((s) => [s.leader.user_id, ...s.members.map((m) => m.user_id)])
            ),
        ];

        if (allUserIds.length === 0) {
            this.loadingOnline.set(false);
            return;
        }

        from(allUserIds)
            .pipe(
                mergeMap(
                    (id) =>
                        this.userService.getPlayer$(id).pipe(
                            map((p) => ({ id, isOnline: p?.is_online ?? false })),
                            catchError(() => of({ id, isOnline: false }))
                        ),
                    5
                ),
                toArray()
            )
            .subscribe((results) => {
                const onlineMap = new Map(results.map((r) => [r.id, r.isOnline]));
                this.enrichedSettlements.update((list) =>
                    list.map((s) => ({
                        ...s,
                        onlineCount: [s.leader.user_id, ...s.members.map((m) => m.user_id)].filter((id) =>
                            onlineMap.get(id)
                        ).length,
                    }))
                );
                this.onlineLoaded = true;
                this.loadingOnline.set(false);
            });
    }
}
