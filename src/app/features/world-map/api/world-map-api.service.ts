import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { isGuildSettlement, ISettlement, SettlementService } from '@entities/settlement';
import { WORLD_MAP_DEMO_POINTS } from '../config/world-map-demo-points.constant';
import { WorldMapData, WorldMapPoint, WorldMapSettlementType } from '../model/world-map-point.interface';

/**
 * Типы поселений, которые знает карта.
 */
const MAP_TYPES: readonly WorldMapSettlementType[] = ['CAMP', 'VILLAGE', 'TOWNSHIP', 'CITY', 'PROVINCE'];

/**
 * Источник данных карты земель.
 *
 * Позиция глашатая (`notifier_position`) приходит только в ответе на одно поселение,
 * в списке её нет. Поэтому сервис берёт список и дочитывает каждое поселение
 * (их единицы-десятки, запросы идут параллельно). Гильдии пропускаются: их глашатай
 * позицию не пишет.
 *
 * Если ни у кого глашатай не стоит (или API недоступен), возвращается пример
 * с флагом `demo` — страница об этом предупреждает. Хуторов в API нет совсем,
 * поэтому на живой карте их пока не будет.
 */
@Injectable({ providedIn: 'root' })
export class WorldMapApiService {
    private readonly settlements = inject(SettlementService);

    /**
     * Загружает поселения для карты.
     *
     * @returns Поселения с поставленным глашатаем и признак примера.
     */
    public load(): Observable<WorldMapData> {
        return this.settlements.getSettlements().pipe(
            map((list) => list.filter((settlement) => !isGuildSettlement(settlement))),
            switchMap((list) =>
                list.length
                    ? forkJoin(
                          list.map((settlement) =>
                              this.settlements.getSettlementById(settlement.id, true).pipe(catchError(() => of(null)))
                          )
                      )
                    : of([])
            ),
            map((details) => details.map((settlement) => this.toPoint(settlement)).filter((point) => point !== null)),
            catchError(() => of([] as WorldMapPoint[])),
            map((points) => (points.length ? { points, demo: false } : this.demo()))
        );
    }

    /**
     * Превращает поселение в точку карты, если у него стоит глашатай.
     *
     * @param settlement Поселение из `GET /settlements/{id}` (или `null` при ошибке).
     * @returns Точка карты или `null`, если глашатая нет.
     */
    private toPoint(settlement: ISettlement | null): WorldMapPoint | null {
        const position = settlement?.notifier_position;
        if (!settlement || !position) {
            return null;
        }

        const type = String(settlement.type) as WorldMapSettlementType;

        return {
            id: settlement.id,
            settlementId: settlement.id,
            name: settlement.name,
            type: MAP_TYPES.includes(type) ? type : 'CAMP',
            diplomacy: settlement.diplomacy,
            membersCount: settlement.members?.length,
            // proto3 не присылает нулевые поля: 0 по оси приходит как отсутствие.
            herald: { x: position.x ?? 0, y: position.y ?? 0, z: position.z ?? 0 },
        };
    }

    /**
     * Пример для пустой карты.
     *
     * @returns Выдуманные поселения с флагом `demo`.
     */
    private demo(): WorldMapData {
        return { points: WORLD_MAP_DEMO_POINTS.map((point) => ({ ...point })), demo: true };
    }
}
