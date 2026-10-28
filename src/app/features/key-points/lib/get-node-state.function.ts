import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { UpgradeNode } from '../model/upgrade-node.interface';
import { UpgradeNodeState } from '../model/upgrade-node-state.type';
import { isRequirementMet } from './is-requirement-met.function';

/**
 * Считает состояние узла в планировщике.
 *
 * @param scheme Схема точки.
 * @param node Узел схемы.
 * @param built Идентификаторы построенных узлов.
 * @returns Состояние узла.
 */
export function getNodeState(scheme: KeyPointScheme, node: UpgradeNode, built: ReadonlySet<string>): UpgradeNodeState {
    if (built.has(node.id)) {
        return 'built';
    }

    const rivalBuilt =
        node.choiceGroup !== undefined &&
        scheme.nodes.some((other) => other.choiceGroup === node.choiceGroup && built.has(other.id));

    if (rivalBuilt) {
        return 'excluded';
    }

    return isRequirementMet(node, built) ? 'available' : 'locked';
}
