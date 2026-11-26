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
import { heraldType } from '../lib/herald-type';

/**
 * Типы наделов, которые знает карта.
 */
const MAP_TYPES: readonly WorldMapSettlementType[] = ['CAMP', 'VILLAGE', 'TOWNSHIP', 'CITY', 'PROVINCE'];

/**
 * Источник данных карты земель.
 *
 * Два параллельных запроса: все стоящие глашатаи (`GET /settlements/notifiers`)
 * и список наделов (`GET /settlements`) — из него берутся название, тип, курс
 * и число жителей.
 *
 * - Глашатай с `settlement_id` — надел. Если надел не нашлось в списке
 *   (удалено, а блок в мире остался) или оказалось гильдией, на карту он не попадает.
 * - Глашатай без `settlement_id` — тип по названию с глашатая (`heraldType`):
 *   Гроссхольм — столица, ключевая точка — ключевая точка, остальное — усадьба.
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
     * @returns Наделы, усадьбы, ключевые точки и столица с глашатаями и признак примера.
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
     * @param list Наделы с сайта.
     * @returns Точки карты.
     */
    private toPoints(placements: readonly INotifierPlacement[], list: readonly ISettlement[]): WorldMapPoint[] {
        const byId = new Map(list.map((settlement) => [settlement.id, settlement]));
        const points: WorldMapPoint[] = [];

        placements.forEach((placement, index) => {
            const herald = this.fromCenter(placement.position);

            if (!placement.settlement_id) {
                const name = placement.name?.trim() || '—';
                points.push({
                    // У глашатая без надела нет id: ключ — номер и позиция, они стабильны между запросами.
                    id: `herald-${index}-${herald.x}-${herald.z}`,
                    name,
                    type: heraldType(name),
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
     * @returns Выдуманные надела с флагом `demo`.
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
