import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { isRequirementMet } from './is-requirement-met.function';

/**
 * Убирает из плана узлы, у которых после изменения перестали выполняться требования.
 *
 * Снятие узла каскадом снимает всё, что на нём держалось: повторяем,
 * пока набор не перестанет меняться.
 *
 * @param scheme Схема точки.
 * @param built Построенные узлы.
 * @returns Согласованный набор построенных узлов.
 */
export function pruneBuilt(scheme: KeyPointScheme, built: ReadonlySet<string>): ReadonlySet<string> {
    const result = new Set(built);
    let changed = true;

    while (changed) {
        changed = false;
        for (const node of scheme.nodes) {
            if (result.has(node.id) && !isRequirementMet(node, result)) {
                result.delete(node.id);
                changed = true;
            }
        }
    }

    return result;
}
