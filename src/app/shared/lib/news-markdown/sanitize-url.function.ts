/**
 * Проверяет ссылку из текста новости.
 *
 * Разрешены только http(s) и относительные пути сайта (`/rules`).
 * Всё остальное (`javascript:`, `data:` и т. п.) отбрасывается.
 *
 * @param url Ссылка в исходном (неэкранированном) виде.
 * @returns Ссылка или null, если она небезопасна.
 */
export function sanitizeUrl(url: string): string | null {
    const trimmed = url.trim();

    if (/^https?:\/\/[^\s]+$/i.test(trimmed) || /^\/(?!\/)[^\s]*$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}
