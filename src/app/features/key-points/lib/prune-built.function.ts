import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { expandAutomatic } from './expand-automatic.function';
import { isRequirementMet } from './is-requirement-met.function';

/**
 * Убирает из плана узлы, у которых после изменения перестали выполняться требования.
 *
 * Снятие узла каскадом снимает всё, что на нём держалось: повторяем,
 * пока набор не перестанет меняться. Требования проверяются с учётом
 * автоматических узлов, а сами они в план не записываются.
 *
 * @param scheme Схема точки.
 * @param built Узлы, отмеченные игроком.
 * @returns Согласованный набор отмеченных узлов.
 */
export function pruneBuilt(scheme: KeyPointScheme, built: ReadonlySet<string>): ReadonlySet<string> {
    const result = new Set(built);
    let changed = true;

    while (changed) {
        changed = false;
        const expanded = expandAutomatic(scheme, result);
        for (const node of scheme.nodes) {
            if (result.has(node.id) && !isRequirementMet(node, expanded)) {
                result.delete(node.id);
                changed = true;
            }
        }
    }

    return result;
}
