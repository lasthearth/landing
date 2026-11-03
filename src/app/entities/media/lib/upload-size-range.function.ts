/**
 * Разбор ограничения размера файла из S3-политики presigned-цели.
 *
 * Хранилище отклоняет тело запроса вне условия `content-length-range` ответом 400,
 * который не объясняет пользователю причину. Условие лежит в поле `policy` формы
 * как base64-JSON, поэтому границы можно прочитать на клиенте до отправки файла.
 */

/**
 * Допустимый размер файла в байтах.
 */
export interface UploadSizeRange {
    /**
     * Нижняя граница в байтах.
     */
    min: number;

    /**
     * Верхняя граница в байтах.
     */
    max: number;
}

/**
 * Ключ условия S3-политики, которое ограничивает размер тела запроса.
 */
const CONTENT_LENGTH_RANGE = 'content-length-range';

/**
 * Проверяет, что значение из JSON — набор полей, а не массив и не примитив.
 *
 * @param value Значение из разобранного JSON.
 * @returns true, если значение можно читать как объект с полями.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Собирает диапазон размера из двух значений.
 *
 * @param min Кандидат на нижнюю границу.
 * @param max Кандидат на верхнюю границу.
 * @returns Границы в байтах или null, если хотя бы одна из них не конечное число.
 */
function toRange(min: unknown, max: unknown): UploadSizeRange | null {
    if (typeof min !== 'number' || typeof max !== 'number' || !Number.isFinite(min) || !Number.isFinite(max)) {
        return null;
    }

    return { min, max };
}

/**
 * Разбирает значение условия `content-length-range`.
 *
 * @param value Кортеж `['content-length-range', min, max]`, пара `[min, max]` или объект `{ min, max }`.
 * @returns Границы в байтах или null, если значение не числовое.
 */
function readRangeValue(value: unknown): UploadSizeRange | null {
    if (Array.isArray(value) && value.length >= 2) {
        return toRange(value[value.length - 2], value[value.length - 1]);
    }

    if (isRecord(value)) {
        return toRange(value['min'], value['max']);
    }

    return null;
}

/**
 * Ищет условие размера в списке `conditions` политики.
 *
 * @param conditions Значение поля `conditions` из JSON политики.
 * @returns Границы в байтах или null, если условия нет либо оно не числовое.
 */
function readRangeFromConditions(conditions: unknown): UploadSizeRange | null {
    if (!Array.isArray(conditions)) {
        return null;
    }

    for (const condition of conditions) {
        // Кортежная форма S3: ["content-length-range", min, max].
        if (Array.isArray(condition) && condition[0] === CONTENT_LENGTH_RANGE) {
            const range = readRangeValue(condition);

            if (range !== null) {
                return range;
            }

            continue;
        }

        // Объектная форма некоторых шлюзов: {"content-length-range": [min, max]}.
        if (isRecord(condition)) {
            const range = readRangeValue(condition[CONTENT_LENGTH_RANGE]);

            if (range !== null) {
                return range;
            }
        }
    }

    return null;
}

/**
 * Декодирует base64-поле `policy` в объект политики.
 *
 * @param encoded Значение поля `policy` из формы S3.
 * @returns Разобранная политика или null, если поля нет либо base64/JSON повреждены.
 */
function readPolicy(encoded: unknown): Record<string, unknown> | null {
    if (typeof encoded !== 'string' || encoded.length === 0) {
        return null;
    }

    try {
        // atob не принимает алфавит base64url, поэтому символы заменяются до декодирования.
        const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

        return isRecord(parsed) ? parsed : null;
    } catch {
        // Отказ разбора осознанный, а не потерянный: без диапазона файл уходит в хранилище
        // как раньше, а его ответ 400 обрабатывает executeUpload и показывает текст ошибки.
        // Проверка размера — только ранняя подсказка, поэтому деградация к null безопасна.
        return null;
    }
}

/**
 * Возвращает допустимый размер файла из S3-политики presigned-цели.
 *
 * Читает поле `policy` формы (base64-JSON), ищет условие `content-length-range`
 * в списке `conditions`, а при его отсутствии — на верхнем уровне политики.
 *
 * @param fields Поля формы presigned-цели: `policy`, `signature`, `key`, `bucket` и другие.
 * @returns Границы в байтах или null, если поля `policy` нет, оно не читается либо условия размера нет.
 */
export function getUploadSizeRange(fields: Record<string, string>): UploadSizeRange | null {
    const policy = readPolicy(fields['policy']);

    if (policy === null) {
        return null;
    }

    return readRangeFromConditions(policy['conditions']) ?? readRangeValue(policy[CONTENT_LENGTH_RANGE]);
}
