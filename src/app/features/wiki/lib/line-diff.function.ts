/**
 * Строка сравнения двух версий текста.
 */
export interface DiffLine {
    readonly kind: 'same' | 'add' | 'del';
    readonly text: string;
}

/**
 * Предел размера таблицы LCS: длиннее — сравнение без выравнивания.
 */
const MAX_CELLS = 4_000_000;

/**
 * Построчное сравнение (наибольшая общая подпоследовательность).
 *
 * @param before Старый текст.
 * @param after Новый текст.
 * @returns Строки с пометками: удалена, добавлена, без изменений.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
    const a = before.split('\n');
    const b = after.split('\n');

    // Общие начало и конец не участвуют в таблице.
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head]) {
        head++;
    }

    let tail = 0;
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) {
        tail++;
    }

    const midA = a.slice(head, a.length - tail);
    const midB = b.slice(head, b.length - tail);
    const result: DiffLine[] = a.slice(0, head).map((text) => ({ kind: 'same', text }));

    if (midA.length * midB.length > MAX_CELLS) {
        result.push(...midA.map((text): DiffLine => ({ kind: 'del', text })));
        result.push(...midB.map((text): DiffLine => ({ kind: 'add', text })));
    } else {
        const rows = midA.length;
        const cols = midB.length;
        const table = new Uint32Array((rows + 1) * (cols + 1));
        const at = (i: number, j: number): number => i * (cols + 1) + j;

        for (let i = rows - 1; i >= 0; i--) {
            for (let j = cols - 1; j >= 0; j--) {
                table[at(i, j)] =
                    midA[i] === midB[j]
                        ? table[at(i + 1, j + 1)] + 1
                        : Math.max(table[at(i + 1, j)], table[at(i, j + 1)]);
            }
        }

        let i = 0;
        let j = 0;

        while (i < rows && j < cols) {
            if (midA[i] === midB[j]) {
                result.push({ kind: 'same', text: midA[i] });
                i++;
                j++;
            } else if (table[at(i + 1, j)] >= table[at(i, j + 1)]) {
                result.push({ kind: 'del', text: midA[i++] });
            } else {
                result.push({ kind: 'add', text: midB[j++] });
            }
        }

        while (i < rows) {
            result.push({ kind: 'del', text: midA[i++] });
        }

        while (j < cols) {
            result.push({ kind: 'add', text: midB[j++] });
        }
    }

    result.push(...a.slice(a.length - tail).map((text): DiffLine => ({ kind: 'same', text })));
    return result;
}
