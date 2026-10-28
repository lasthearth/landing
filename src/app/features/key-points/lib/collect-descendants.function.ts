import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { getNodeParents } from './get-node-parents.function';

/**
 * Собирает все узлы, которые открываются после данного (прямо или через цепочку).
 *
 * @param scheme Схема точки.
 * @param nodeId Идентификатор узла.
 * @returns Идентификаторы потомков без самого узла.
 */
export function collectDescendants(scheme: KeyPointScheme, nodeId: string): ReadonlySet<string> {
    const result = new Set<string>();
    const queue = [nodeId];

    while (queue.length) {
        const current = queue.pop() as string;
        for (const node of scheme.nodes) {
            if (!result.has(node.id) && getNodeParents(node).includes(current)) {
                result.add(node.id);
                queue.push(node.id);
            }
        }
    }

    return result;
}
