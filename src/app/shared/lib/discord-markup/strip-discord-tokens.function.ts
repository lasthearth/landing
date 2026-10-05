/**
 * Discord-токены (упоминания, каналы, кастомные эмодзи, @everyone/@here) с пробелами вокруг.
 */
const DISCORD_TOKEN_PATTERN = /([ \t]*)(?:<@!?\d+>|<@&\d+>|<#\d+>|<a?:\w+:\d+>|@(?:everyone|here))([ \t]*)/g;

/**
 * Убирает из сообщения Discord служебные токены, которые вне Discord не имеют смысла:
 * упоминания пользователей, ролей и каналов, кастомные эмодзи, @everyone/@here.
 *
 * Разметку (жирный, курсив, спойлеры, списки) не трогает — её превращает
 * в HTML `renderNewsMarkdown`, тем же рендером, что и новости.
 *
 * @param content Исходный текст сообщения.
 * @returns Текст без служебных токенов.
 */
export function stripDiscordTokens(content: string): string {
    return (
        content
            // Вместе с токеном убираем лишний пробел, чтобы не оставалось «мир  и союз».
            .replace(DISCORD_TOKEN_PATTERN, (token: string, before: string, after: string, offset: number, whole: string) => {
                const atLineStart = offset === 0 || whole[offset - 1] === '\n';
                const atLineEnd = !whole[offset + token.length] || whole[offset + token.length] === '\n';
                return before && after && !atLineStart && !atLineEnd ? ' ' : '';
            })
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}
