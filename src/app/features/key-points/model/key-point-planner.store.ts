import { Injectable, signal } from '@angular/core';
import { expandAutomatic } from '../lib/expand-automatic.function';
import { getNodeState } from '../lib/get-node-state.function';
import { planKeyOf } from '../lib/plan-key-of.function';
import { pruneBuilt } from '../lib/prune-built.function';
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
    private readonly plans = signal<Readonly<Record<string, ReadonlySet<string>>>>({});

    /**
     * Построенные узлы точки вместе с открывшимися автоматически.
     *
     * @param scheme Схема точки.
     * @returns Набор идентификаторов (пустой, если план не начат).
     */
    public builtOf(scheme: KeyPointScheme): ReadonlySet<string> {
        return expandAutomatic(scheme, this.marked(planKeyOf(scheme)));
    }

    /**
     * Узлы, которые игрок отметил сам (без автоматических).
     *
     * @param planKey Ключ плана (`planKeyOf`).
     * @returns Набор идентификаторов.
     */
    private marked(planKey: string): ReadonlySet<string> {
        return this.plans()[planKey] ?? new Set<string>();
    }

    /**
     * Отмечает узел построенным или снимает отметку.
     *
     * Недоступный узел (не хватает требований или выбрана другая специализация)
     * и автоматический узел не отмечаются. Снятие узла снимает и всё, что на нём держалось.
     *
     * @param scheme Схема точки.
     * @param node Узел.
     */
    public toggle(scheme: KeyPointScheme, node: UpgradeNode): void {
        if (node.automatic) {
            return;
        }

        const marked = this.marked(planKeyOf(scheme));
        const state = getNodeState(scheme, node, this.builtOf(scheme));

        if (state === 'built') {
            const next = new Set(marked);
            next.delete(node.id);
            this.set(planKeyOf(scheme), pruneBuilt(scheme, next));
        } else if (state === 'available') {
            this.set(planKeyOf(scheme), new Set([...marked, node.id]));
        }
    }

    /**
     * Сбрасывает план точки.
     *
     * @param scheme Схема точки.
     */
    public reset(scheme: KeyPointScheme): void {
        this.set(planKeyOf(scheme), new Set<string>());
    }

    /**
     * Записывает план точки.
     *
     * @param planKey Ключ плана (`planKeyOf`).
     * @param built Новый набор построенных узлов.
     */
    private set(planKey: string, built: ReadonlySet<string>): void {
        this.plans.update((plans) => ({ ...plans, [planKey]: built }));
    }
}
