/**
 * Экранирует спецсимволы HTML.
 *
 * @param text Исходный текст.
 * @returns Текст, безопасный для вставки в HTML и значения атрибутов.
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
