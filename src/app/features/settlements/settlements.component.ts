import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SettlementService } from '@entities/settlement';
import { UserService } from '@entities/user';
import { SettlementCardComponent } from './settlement-card/settlement-card.component';
import { SettlementCardSkeletonComponent } from '@shared/ui/skeletons';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { from, mergeMap, of, toArray } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ISettlement } from '@entities/settlement';
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
    protected readonly skeletonItems = Array.from({ length: 3 });
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);

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

        switch (field) {
            case 'population':
                return list.sort((a, b) => dir * (a.membersCount - b.membersCount));
            case 'online':
                return list.sort((a, b) => dir * (a.onlineCount - b.onlineCount));
            case 'east':
                return list.sort((a, b) => dir * ((a.tagTypes.has('east') ? 1 : 0) - (b.tagTypes.has('east') ? 1 : 0)));
            case 'west':
                return list.sort((a, b) => dir * ((a.tagTypes.has('west') ? 1 : 0) - (b.tagTypes.has('west') ? 1 : 0)));
            case 'suzerain':
                return list.sort((a, b) => dir * ((a.tagTypes.has('suzerain') ? 1 : 0) - (b.tagTypes.has('suzerain') ? 1 : 0)));
            case 'diplomacy':
                return list.sort((a, b) => dir * a.diplomacy.localeCompare(b.diplomacy));
            default:
                return list;
        }
    });

    constructor() {
        this.loadSettlements();
    }

    /**
     * Загружает список селений и обогащает базовыми данными.
     */
    private loadSettlements(): void {
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
                        tagTypes: new Set(
                            s.tags
                                .map((t) => this.settlementService.getTagById(t.id)?.type)
                                .filter(Boolean) as string[]
                        ),
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
