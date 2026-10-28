import { Injectable, signal } from '@angular/core';
import { getNodeState } from '../lib/get-node-state.function';
import { pruneBuilt } from '../lib/prune-built.function';
import { KeyPointId } from './key-point-id.type';
import { KeyPointScheme } from './key-point-scheme.interface';
import { UpgradeNode } from './upgrade-node.interface';

/**
 * План прокачки: какие улучшения игрок отметил построенными на каждой точке.
 *
 * Это песочница для игрока, а не данные сервера: план живёт, пока открыта страница.
 * Предоставляется на уровне страницы, чтобы при переключении вкладок план точки не терялся.
 */
@Injectable()
export class KeyPointPlannerStore {
    /**
     * Построенные узлы по точкам.
     */
    private readonly plans = signal<Partial<Record<KeyPointId, ReadonlySet<string>>>>({});

    /**
     * Построенные узлы точки.
     *
     * @param pointId Тип точки.
     * @returns Набор идентификаторов (пустой, если план не начат).
     */
    public builtOf(pointId: KeyPointId): ReadonlySet<string> {
        return this.plans()[pointId] ?? new Set<string>();
    }

    /**
     * Отмечает узел построенным или снимает отметку.
     *
     * Недоступный узел (не хватает требований или выбрана другая специализация)
     * не отмечается. Снятие узла снимает и всё, что на нём держалось.
     *
     * @param scheme Схема точки.
     * @param node Узел.
     */
    public toggle(scheme: KeyPointScheme, node: UpgradeNode): void {
        const built = this.builtOf(scheme.id);
        const state = getNodeState(scheme, node, built);

        if (state === 'built') {
            const next = new Set(built);
            next.delete(node.id);
            this.set(scheme.id, pruneBuilt(scheme, next));
        } else if (state === 'available') {
            this.set(scheme.id, new Set([...built, node.id]));
        }
    }

    /**
     * Сбрасывает план точки.
     *
     * @param pointId Тип точки.
     */
    public reset(pointId: KeyPointId): void {
        this.set(pointId, new Set<string>());
    }

    /**
     * Записывает план точки.
     *
     * @param pointId Тип точки.
     * @param built Новый набор построенных узлов.
     */
    private set(pointId: KeyPointId, built: ReadonlySet<string>): void {
        this.plans.update((plans) => ({ ...plans, [pointId]: built }));
    }
}
