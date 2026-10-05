import { stripDiscordTokens } from '@shared/lib/discord-markup';
import { renderInlineMarkdown } from '@shared/lib/news-markdown';
import { replaceDiscordEmojis } from './discord-emoji';

/**
 * Превращает текст сообщения из Discord в безопасный HTML.
 *
 * Убирает упоминания и кастомные эмодзи, заменяет `:skull:` на 💀 и рендерит
 * строчную разметку Discord (жирный, курсив, спойлеры, ссылки) тем же рендерером,
 * что и новости: весь текст экранируется, ссылки проверяются.
 *
 * @param content Текст сообщения.
 * @returns HTML для `[innerHTML]`.
 */
export function renderChatContent(content: string): string {
    return renderInlineMarkdown(replaceDiscordEmojis(stripDiscordTokens(content ?? '')));
}
