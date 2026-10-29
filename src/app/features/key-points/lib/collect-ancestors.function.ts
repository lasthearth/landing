import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { getNodeParents } from './get-node-parents.function';

/**
 * Собирает все узлы, ведущие к данному (требования требований и т.д.).
 *
 * @param scheme Схема точки.
 * @param nodeId Идентификатор узла.
 * @returns Идентификаторы предков без самого узла.
 */
export function collectAncestors(scheme: KeyPointScheme, nodeId: string): ReadonlySet<string> {
    const byId = new Map(scheme.nodes.map((node) => [node.id, node]));
    const result = new Set<string>();
    const queue = [nodeId];

    while (queue.length) {
        const node = byId.get(queue.pop() as string);
        for (const parent of node ? getNodeParents(node) : []) {
            if (!result.has(parent)) {
                result.add(parent);
                queue.push(parent);
            }
        }
    }

    return result;
}
