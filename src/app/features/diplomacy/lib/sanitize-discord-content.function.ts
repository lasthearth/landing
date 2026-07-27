/**
 * Очищает текст Discord-сообщения от служебной разметки.
 *
 * Удаляет упоминания пользователей, ролей и каналов (`<@id>`, `<@&id>`, `<#id>`),
 * кастомные эмодзи, `@everyone`/`@here`, а также markdown-разметку
 * (заголовки `##`, жирный `**`, курсив `*`, зачёркивание `~~`, код, цитаты),
 * оставляя только читаемый текст.
 *
 * @param content Исходный текст сообщения.
 * @returns Очищенный текст без Discord- и markdown-разметки.
 */
export function sanitizeDiscordContent(content: string): string {
    return content
        .replace(/<@!?\d+>/g, '')
        .replace(/<@&\d+>/g, '')
        .replace(/<#\d+>/g, '')
        .replace(/<a?:\w+:\d+>/g, '')
        .replace(/@(everyone|here)/g, '')
        .replace(/#{1,6}\s?/g, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
        .replace(/^\s*>\s?/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
