import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { UpgradeEdge } from '../model/upgrade-edge.interface';

/**
 * Строит линии схемы в координатах холста (`lanes·100 × tiers·100`).
 *
 * Линия — вертикальная S-кривая от центра требования к центру зависимого узла:
 * медальоны непрозрачные и лежат поверх, поэтому концы линий под ними не видны.
 *
 * @param scheme Схема точки.
 * @returns Линии схемы.
 */
export function buildSchemeEdges(scheme: KeyPointScheme): readonly UpgradeEdge[] {
    const byId = new Map(scheme.nodes.map((node) => [node.id, node]));
    const edges: UpgradeEdge[] = [];

    for (const node of scheme.nodes) {
        const links = [
            ...node.requires.map((id) => ({ id, optional: false })),
            ...(node.requiresAny ?? []).map((id) => ({ id, optional: true })),
        ];

        for (const link of links) {
            const parent = byId.get(link.id);
            if (!parent) {
                continue;
            }

            const x1 = parent.lane * 100 + 50;
            const y1 = parent.tier * 100 + 50;
            const x2 = node.lane * 100 + 50;
            const y2 = node.tier * 100 + 50;
            const middle = (y1 + y2) / 2;

            edges.push({
                key: `${parent.id}-${node.id}`,
                from: parent.id,
                to: node.id,
                path: `M ${x1} ${y1} C ${x1} ${middle}, ${x2} ${middle}, ${x2} ${y2}`,
                optional: link.optional,
            });
        }
    }

    return edges;
}
