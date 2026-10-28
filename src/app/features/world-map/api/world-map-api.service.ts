import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { INotifierPlacement, isGuildSettlement, ISettlement, SettlementService } from '@entities/settlement';
import { WORLD_MAP_DEMO_POINTS } from '../config/world-map-demo-points.constant';
import { WorldMapData, WorldMapPoint, WorldMapSettlementType } from '../model/world-map-point.interface';

/**
 * Типы поселений, которые знает карта.
 */
const MAP_TYPES: readonly WorldMapSettlementType[] = ['CAMP', 'VILLAGE', 'TOWNSHIP', 'CITY', 'PROVINCE'];

/**
 * Источник данных карты земель.
 *
 * Два параллельных запроса: позиции всех глашатаев (`GET /settlements/notifiers`)
 * и список поселений (`GET /settlements`) — из него берутся название, тип, курс
 * и число жителей. Глашатай, чьё поселение не нашлось в списке (поселение удалили,
 * а блок в мире остался) или оказалось гильдией, на карту не попадает.
 *
 * Если ни одного глашатая нет (или API недоступен), возвращается пример с флагом
 * `demo` — страница об этом предупреждает. Хуторов в API нет, на живой карте их пока не будет.
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
        return forkJoin({
            placements: this.settlements.getNotifierPositions$(),
            list: this.settlements.getSettlements(),
        }).pipe(
            map(({ placements, list }) => this.toPoints(placements, list)),
            catchError(() => of([] as WorldMapPoint[])),
            map((points) => (points.length ? { points, demo: false } : this.demo()))
        );
    }

    /**
     * Сопоставляет глашатаев с поселениями.
     *
     * @param placements Позиции глашатаев.
     * @param list Поселения с сайта.
     * @returns Точки карты.
     */
    private toPoints(placements: readonly INotifierPlacement[], list: readonly ISettlement[]): WorldMapPoint[] {
        const byId = new Map(list.map((settlement) => [settlement.id, settlement]));
        const points: WorldMapPoint[] = [];

        for (const placement of placements) {
            const settlement = byId.get(placement.settlement_id);
            if (!settlement || isGuildSettlement(settlement)) {
                continue;
            }

            const type = String(settlement.type) as WorldMapSettlementType;
            const position = placement.position ?? {};

            points.push({
                id: settlement.id,
                settlementId: settlement.id,
                name: settlement.name,
                type: MAP_TYPES.includes(type) ? type : 'CAMP',
                diplomacy: settlement.diplomacy,
                membersCount: settlement.members?.length,
                herald: { x: position.x ?? 0, y: position.y ?? 0, z: position.z ?? 0 },
            });
        }

        return points;
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
