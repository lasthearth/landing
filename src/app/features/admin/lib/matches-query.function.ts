/**
 * Проверяет, содержит ли хотя бы одна строка поисковый запрос.
 *
 * Сравнение без учёта регистра, «ё» приравнена к «е». Пустой запрос подходит ко всему.
 *
 * @param query Текст поиска.
 * @param fields Строки, по которым ищем (название, код и т.п.).
 * @returns true, если запрос найден.
 */
export function matchesQuery(query: string, fields: readonly (string | null | undefined)[]): boolean {
    const normalize = (value: string): string => value.toLocaleLowerCase('ru').replaceAll('ё', 'е');
    const needle = normalize(query.trim());

    if (!needle) {
        return true;
    }

    return fields.some((field) => !!field && normalize(field).includes(needle));
}
