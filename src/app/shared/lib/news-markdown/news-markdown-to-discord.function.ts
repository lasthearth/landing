/**
 * Готовит текст новости для публикации в Discord.
 *
 * Разметка редактора и так совпадает с разметкой Discord, отличаются
 * только картинки: Discord не понимает `![подпись](url)`, поэтому они
 * заменяются ссылкой, которую Discord развернёт в превью.
 *
 * @param source Исходный текст из редактора.
 * @returns Текст для Discord.
 */
export function newsMarkdownToDiscord(source: string): string {
    return source
        .replace(/\r\n?/g, '\n')
        .replace(/^\s*!\[([^\]\n]*)\]\(([^)\s]+)\)\s*$/gm, (_, alt: string, url: string) =>
            alt.trim() ? `${alt.trim()}: ${url}` : url
        )
        .trim();
}
