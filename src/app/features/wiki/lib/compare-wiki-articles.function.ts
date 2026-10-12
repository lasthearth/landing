import { WikiArticle } from '@entities/wiki';

/**
 * Что именно поменялось в поле статьи.
 */
export interface WikiFieldChange {
    /**
     * Имя поля статьи — по нему берётся подпись `wiki.review.field.<key>`.
     */
    readonly key: string;
    /**
     * Как было; пустая строка — поля не было.
     */
    readonly before: string;
    /**
     * Как предлагает игрок.
     */
    readonly after: string;
    /**
     * Текст длинный: показывать его построчно, а не одной строкой в таблице.
     */
    readonly multiline: boolean;
}

/**
 * Поля статьи, которые имеет смысл сравнивать, и их порядок в списке.
 *
 * Текст статьи сравнивается отдельно и построчно, поэтому здесь его нет.
 */
const COMPARED_FIELDS: readonly (keyof WikiArticle)[] = [
    'title',
    'slug',
    'sectionId',
    'lead',
    'tags',
    'gameVersion',
    'cover',
    'quickAnswer',
    'related',
    'status',
];

/**
 * Приводит значение поля к тексту для сравнения.
 *
 * @param value Значение поля любого типа.
 * @returns Текст; пустая строка означает «поля нет».
 */
function toText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean).join(', ');
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;

        // Обложка: адрес и кадр (кадр — процент, поэтому приводим к тексту);
        // быстрый ответ: вопрос и ответ.
        const url =
            typeof record['url'] === 'string' && record['url']
                ? `${record['url']} (${String(record['focus'] ?? 0)}%)`
                : '';
        const parts = [url, record['question'], record['answer']].filter(
            (part): part is string => typeof part === 'string' && part.length > 0
        );

        if (parts.length) {
            return parts.join(' — ');
        }

        return JSON.stringify(record);
    }

    return String(value);
}

/**
 * Перечисляет поля, которые предложение меняет.
 *
 * Сравнивает опубликованную статью с предложенной и возвращает только различия —
 * чтобы редактор видел, что затронуто, не читая весь текст.
 *
 * @param current Статья, как она опубликована; `null` для новой.
 * @param proposal Статья, как её предложил игрок.
 * @returns Изменённые поля в порядке из {@link COMPARED_FIELDS}.
 */
export function compareWikiArticles(
    current: WikiArticle | null,
    proposal: WikiArticle | null
): readonly WikiFieldChange[] {
    if (!proposal) {
        return [];
    }

    // Новая статья: показывать «было» нечего, поэтому список пуст — редактор
    // читает её целиком.
    if (!current) {
        return [];
    }

    const changes: WikiFieldChange[] = [];

    for (const key of COMPARED_FIELDS) {
        const before = toText(current[key]);
        const after = toText(proposal[key]);

        if (before === after) {
            continue;
        }

        changes.push({
            key,
            before,
            after,
            multiline: before.length > 120 || after.length > 120 || before.includes('\n') || after.includes('\n'),
        });
    }

    return changes;
}
