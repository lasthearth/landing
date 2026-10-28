import { UpgradeCost } from '../model/upgrade-cost.interface';
import { UpgradeNode } from '../model/upgrade-node.interface';

/**
 * Складывает стоимость нескольких узлов по ресурсам.
 *
 * @param nodes Узлы, стоимость которых суммируется.
 * @returns Итог по каждому ресурсу в порядке первого появления.
 */
export function sumCosts(nodes: readonly UpgradeNode[]): readonly UpgradeCost[] {
    const totals = new Map<UpgradeCost['resource'], number>();

    for (const node of nodes) {
        for (const cost of node.cost) {
            totals.set(cost.resource, (totals.get(cost.resource) ?? 0) + cost.amount);
        }
    }

    return [...totals].map(([resource, amount]) => ({ resource, amount }));
}
