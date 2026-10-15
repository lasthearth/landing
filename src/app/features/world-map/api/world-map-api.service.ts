import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { WORLD_MAP_DEMO_POINTS } from '../config/world-map-demo-points.constant';
import { WorldMapData } from '../model/world-map-point.interface';

/**
 * Источник данных карты земель.
 *
 * Пока бэкенд не отдаёт позиции глашатаев списком (`notifier_position` есть
 * только в ответе на одно поселение), сервис возвращает пример с флагом `demo`.
 * Когда появится список — например `GET /v1/settlements/map` с полями
 * id, name, type, diplomacy, members_count и notifier_position от точки
 * появления, — достаточно заменить тело `load()`, страница не изменится.
 */
@Injectable({ providedIn: 'root' })
export class WorldMapApiService {
    /**
     * Загружает поселения для карты.
     *
     * @returns Поселения с поставленным глашатаем и признак примера.
     */
    public load(): Observable<WorldMapData> {
        return of({ points: WORLD_MAP_DEMO_POINTS.map((point) => ({ ...point })), demo: true });
    }
}
