import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { isRequirementMet } from './is-requirement-met.function';

/**
 * Добавляет к построенным узлы, которые открываются сами (`automatic`).
 *
 * Автоматический узел может открывать следующий автоматический, поэтому
 * повторяем, пока набор растёт.
 *
 * @param scheme Схема точки.
 * @param built Узлы, отмеченные игроком.
 * @returns Отмеченные узлы плюс открывшиеся автоматически.
 */
export function expandAutomatic(scheme: KeyPointScheme, built: ReadonlySet<string>): ReadonlySet<string> {
    const result = new Set(built);
    let changed = true;

    while (changed) {
        changed = false;
        for (const node of scheme.nodes) {
            if (node.automatic && !result.has(node.id) && isRequirementMet(node, result)) {
                result.add(node.id);
                changed = true;
            }
        }
    }

    return result;
}
