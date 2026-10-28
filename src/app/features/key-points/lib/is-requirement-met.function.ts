import { UpgradeNode } from '../model/upgrade-node.interface';

/**
 * Проверяет, выполнены ли требования узла при данном наборе построенных узлов.
 *
 * @param node Узел схемы.
 * @param built Идентификаторы построенных узлов.
 * @returns `true`, если построены все `requires` и хотя бы один из `requiresAny` (если он задан).
 */
export function isRequirementMet(node: UpgradeNode, built: ReadonlySet<string>): boolean {
    const all = node.requires.every((id) => built.has(id));
    const any = !node.requiresAny?.length || node.requiresAny.some((id) => built.has(id));

    return all && any;
}
