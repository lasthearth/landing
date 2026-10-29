import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { INotifierPlacement, isGuildSettlement, ISettlement, SettlementService } from '@entities/settlement';
import { WORLD_MAP_DEMO_POINTS } from '../config/world-map-demo-points.constant';
import { WORLD_SPAWN } from '../config/world-spawn.constant';
import { WORLD_MAP_CENTER } from '../config/world-map-center.constant';
import {
    WorldMapData,
    WorldMapPoint,
    WorldMapPosition,
    WorldMapSettlementType,
} from '../model/world-map-point.interface';

/**
 * Типы поселений, которые знает карта.
 */
const MAP_TYPES: readonly WorldMapSettlementType[] = ['CAMP', 'VILLAGE', 'TOWNSHIP', 'CITY', 'PROVINCE'];

/**
 * Источник данных карты земель.
 *
 * Два параллельных запроса: все стоящие глашатаи (`GET /settlements/notifiers`)
 * и список поселений (`GET /settlements`) — из него берутся название, тип, курс
 * и число жителей.
 *
 * - Глашатай с `settlement_id` — поселение. Если поселение не нашлось в списке
 *   (удалено, а блок в мире остался) или оказалось гильдией, на карту он не попадает.
 * - Глашатай без `settlement_id` — ключевая точка: на карте с названием с глашатая.
 *
 * Сервер присылает абсолютные координаты; карта показывает их от Очага (`WORLD_SPAWN`).
 * Если глашатаев нет (или API недоступен), возвращается пример с флагом `demo`.
 */
@Injectable({ providedIn: 'root' })
export class WorldMapApiService {
    private readonly settlements = inject(SettlementService);

    /**
     * Загружает точки карты.
     *
     * @returns Поселения и ключевые точки с глашатаями и признак примера.
     */
    public load(): Observable<WorldMapData> {
        return forkJoin({
            placements: this.settlements.getNotifierPositions$(),
            list: this.settlements.getSettlements().pipe(catchError(() => of([] as ISettlement[]))),
        }).pipe(
            map(({ placements, list }) => this.toPoints(placements, list)),
            catchError(() => of([] as WorldMapPoint[])),
            map((points) => (points.length ? { points, demo: false } : this.demo()))
        );
    }

    /**
     * Превращает глашатаев в точки карты.
     *
     * @param placements Глашатаи.
     * @param list Поселения с сайта.
     * @returns Точки карты.
     */
    private toPoints(placements: readonly INotifierPlacement[], list: readonly ISettlement[]): WorldMapPoint[] {
        const byId = new Map(list.map((settlement) => [settlement.id, settlement]));
        const points: WorldMapPoint[] = [];

        placements.forEach((placement, index) => {
            const herald = this.fromCenter(placement.position);

            if (!placement.settlement_id) {
                points.push({
                    // У ключевой точки нет id: ключ — номер и позиция, они стабильны между запросами.
                    id: `key-point-${index}-${herald.x}-${herald.z}`,
                    name: placement.name?.trim() || '—',
                    type: 'KEY_POINT',
                    herald,
                });
                return;
            }

            const settlement = byId.get(placement.settlement_id);
            if (!settlement || isGuildSettlement(settlement)) {
                return;
            }

            const type = String(settlement.type) as WorldMapSettlementType;
            points.push({
                id: settlement.id,
                settlementId: settlement.id,
                name: settlement.name,
                type: MAP_TYPES.includes(type) ? type : 'CAMP',
                diplomacy: settlement.diplomacy,
                membersCount: settlement.members?.length,
                herald,
            });
        });

        return points;
    }

    /**
     * Переводит абсолютную позицию в координаты от Очага.
     *
     * @param position Позиция блока из API (нулевые оси proto3 не присылает).
     * @returns Позиция от Очага.
     */
    private fromCenter(position: INotifierPlacement['position']): WorldMapPosition {
        return {
            x: (position?.x ?? 0) - WORLD_SPAWN.x - WORLD_MAP_CENTER.x,
            y: position?.y ?? 0,
            z: (position?.z ?? 0) - WORLD_SPAWN.z - WORLD_MAP_CENTER.z,
        };
    }

    /**
     * Пример для пустой карты.
     *
     * @returns Выдуманные поселения с флагом `demo`.
     */
    private demo(): WorldMapData {
        return {
            points: WORLD_MAP_DEMO_POINTS.map((point) => ({
                ...point,
                herald: {
                    ...point.herald,
                    x: point.herald.x - WORLD_MAP_CENTER.x,
                    z: point.herald.z - WORLD_MAP_CENTER.z,
                },
            })),
            demo: true,
        };
    }
}
