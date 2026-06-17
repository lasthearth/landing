/**
 * Возвращает строковый URL аватара из разных форматов ответа API.
 *
 * Поддерживает:
 * - строку (используется как есть);
 * - объект `{ original: string }`;
 * - отсутствующее значение — возвращает путь к аватару по умолчанию.
 *
 * @param value Значение аватара из API.
 * @returns URL аватара или путь к аватару по умолчанию.
 */
export function resolveAvatarUrl(value: unknown): string {
    if (!value) {
        return '/default-avatar.png';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'object' && value !== null && 'original' in value) {
        const original = (value as Record<string, unknown>)['original'];

        if (typeof original === 'string') {
            return original;
        }
    }

    return '/default-avatar.png';
}
