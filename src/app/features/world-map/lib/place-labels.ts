/**
 * Место для подписи на экране (левый верхний угол), пиксели.
 */
export interface LabelPosition {
    x: number;
    y: number;
    /** Сторона от знака, чтобы знать, как выровнять текст. */
    side?: 'left' | 'right';
}

/**
 * Подпись, которую нужно разместить на карте.
 */
export interface LabelCandidate {
    id: string;
    /** Места в порядке предпочтения: например, справа от знака, потом слева. */
    positions: readonly LabelPosition[];
    width: number;
    height: number;
    /** Чем больше, тем раньше подпись получает место. */
    priority: number;
}

/**
 * Прямоугольник на экране.
 */
export interface LabelBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Выбирает, какие подписи показать и с какой стороны от знака.
 *
 * Когда карта отдалена, названия соседних наделов налезают друг на друга.
 * Крупные надела подписываются первыми; подпись пробует места по порядку
 * и скрывается, только если не влезла ни в одно — скрытое название
 * по-прежнему видно при наведении и в карточке.
 *
 * @param candidates Подписи с возможными местами.
 * @param obstacles Занятые места, куда подпись класть нельзя: знаки, кнопки, картуш.
 * @param gap Минимальный зазор между подписями, пиксели.
 * @returns Для каждой показанной подписи — выбранное место.
 */
export function placeLabels(
    candidates: readonly LabelCandidate[],
    obstacles: readonly LabelBox[] = [],
    gap = 4
): Map<string, LabelPosition> {
    const placed: LabelBox[] = [];
    const chosen = new Map<string, LabelPosition>();
    const ordered = [...candidates].sort((a, b) => b.priority - a.priority);

    for (const label of ordered) {
        const position = label.positions.find((candidate) => {
            const box = { x: candidate.x, y: candidate.y, width: label.width, height: label.height };

            // Между подписями нужен зазор; знак же стоит вплотную к своей подписи.
            return (
                !placed.some((other) => overlaps(box, other, gap)) &&
                !obstacles.some((other) => overlaps(box, other, 0))
            );
        });

        if (position) {
            placed.push({ x: position.x, y: position.y, width: label.width, height: label.height });
            chosen.set(label.id, position);
        }
    }

    return chosen;
}

/**
 * Пересекаются ли прямоугольники с учётом зазора.
 */
function overlaps(a: LabelBox, b: LabelBox, gap: number): boolean {
    return (
        a.x < b.x + b.width + gap &&
        b.x < a.x + a.width + gap &&
        a.y < b.y + b.height + gap &&
        b.y < a.y + a.height + gap
    );
}
