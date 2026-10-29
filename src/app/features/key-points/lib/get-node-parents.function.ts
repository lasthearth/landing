import { UpgradeNode } from '../model/upgrade-node.interface';

/**
 * Возвращает прямые требования узла: обязательные и «любой из».
 *
 * @param node Узел схемы.
 * @returns Идентификаторы узлов-требований.
 */
export function getNodeParents(node: UpgradeNode): readonly string[] {
    return [...node.requires, ...(node.requiresAny ?? [])];
}
