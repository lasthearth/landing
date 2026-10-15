/**
 * Подпись, которую нужно разместить на карте.
 */
export interface LabelCandidate {
    id: string;
    /** Левый край подписи, пиксели. */
    x: number;
    /** Верхний край подписи, пиксели. */
    y: number;
    width: number;
    height: number;
    /** Чем больше, тем раньше подпись получает место. */
    priority: number;
}

/**
 * Выбирает подписи, которые помещаются без наложений.
 *
 * Когда карта отдалена, названия соседних поселений налезают друг на друга.
 * Крупные поселения подписываются первыми, мелкие — если осталось место;
 * скрытое название по-прежнему видно при наведении и в карточке.
 *
 * @param candidates Подписи с прямоугольниками.
 * @param obstacles Занятые места, куда подпись класть нельзя: сами метки.
 * @param gap Минимальный зазор между подписями, пиксели.
 * @returns Идентификаторы подписей, которые показываем.
 */
export function placeLabels(
    candidates: readonly LabelCandidate[],
    obstacles: readonly Box[] = [],
    gap = 4
): Set<string> {
    const placed: Box[] = [];
    const visible = new Set<string>();
    const ordered = [...candidates].sort((a, b) => b.priority - a.priority);

    for (const label of ordered) {
        // Между подписями нужен зазор; метка же стоит вплотную к своей подписи.
        const collides =
            placed.some((other) => overlaps(label, other, gap)) || obstacles.some((other) => overlaps(label, other, 0));

        if (!collides) {
            placed.push(label);
            visible.add(label.id);
        }
    }

    return visible;
}

/**
 * Прямоугольник на экране.
 */
type Box = Pick<LabelCandidate, 'x' | 'y' | 'width' | 'height'>;

/**
 * Пересекаются ли прямоугольники с учётом зазора.
 */
function overlaps(a: Box, b: Box, gap: number): boolean {
    return a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
}
