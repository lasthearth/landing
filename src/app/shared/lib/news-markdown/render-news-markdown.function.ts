import { escapeHtml } from './escape-html.function';
import { renderInlineMarkdown } from './render-inline-markdown.function';
import { sanitizeUrl } from './sanitize-url.function';

/**
 * Превращает текст новости в HTML для сайта.
 *
 * Блоки:
 * - пустая строка разделяет абзацы, одиночный перевод строки — `<br>`;
 * - `# ` и `## ` — подзаголовок, `### ` — подзаголовок поменьше;
 * - `- ` / `* ` — маркированный список, `1. ` — нумерованный;
 * - `> ` — цитата;
 * - `---` — разделитель;
 * - строка `![подпись](https://…)` — картинка с подписью.
 *
 * Внутри блоков работает строчная разметка — см. {@link renderInlineMarkdown}.
 *
 * @param source Исходный текст из редактора.
 * @returns HTML без переводов строк между блоками.
 */
export function renderNewsMarkdown(source: string): string {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const blocks: string[] = [];
    let index = 0;

    /**
     * Собирает подряд идущие строки, подходящие под шаблон.
     */
    const collect = (pattern: RegExp): string[] => {
        const items: string[] = [];

        while (index < lines.length) {
            const match = pattern.exec(lines[index]);

            if (!match) {
                break;
            }

            items.push(match[1]);
            index++;
        }

        return items;
    };

    while (index < lines.length) {
        const line = lines[index];

        if (!line.trim()) {
            index++;
            continue;
        }

        const heading = /^(#{1,3})\s+(.+)$/.exec(line);

        if (heading) {
            const tag = heading[1].length === 3 ? 'h4' : 'h3';
            blocks.push(`<${tag}>${renderInlineMarkdown(heading[2].trim())}</${tag}>`);
            index++;
            continue;
        }

        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            blocks.push('<hr>');
            index++;
            continue;
        }

        const image = /^\s*!\[([^\]\n]*)\]\(([^)\s]+)\)\s*$/.exec(line);
        const imageUrl = image ? sanitizeUrl(image[2]) : null;

        if (image && imageUrl) {
            const alt = image[1].trim();
            const caption = alt ? `<figcaption>${renderInlineMarkdown(alt)}</figcaption>` : '';
            blocks.push(`<figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}">${caption}</figure>`);
            index++;
            continue;
        }

        if (/^>\s?/.test(line)) {
            const quote = collect(/^>\s?(.*)$/);
            blocks.push(`<blockquote>${quote.map((item) => renderInlineMarkdown(item)).join('<br>')}</blockquote>`);
            continue;
        }

        if (/^\s*[-*•]\s+/.test(line)) {
            const items = collect(/^\s*[-*•]\s+(.*)$/);
            blocks.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
            continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
            const items = collect(/^\s*\d+[.)]\s+(.*)$/);
            blocks.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
            continue;
        }

        // Абзац: строки до пустой строки или до начала другого блока.
        const paragraph: string[] = [];

        while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
            paragraph.push(lines[index]);
            index++;
        }

        if (paragraph.length === 0) {
            // Строка похожа на начало блока, но не разобралась (например, картинка с небезопасной ссылкой).
            paragraph.push(lines[index]);
            index++;
        }

        blocks.push(`<p>${paragraph.map((item) => renderInlineMarkdown(item)).join('<br>')}</p>`);
    }

    return blocks.join('');
}

/**
 * Начинается ли со строки новый блок (заголовок, список, цитата и т. п.).
 *
 * @param line Строка текста.
 */
function isBlockStart(line: string): boolean {
    return (
        /^#{1,3}\s+/.test(line) ||
        /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
        /^\s*!\[[^\]\n]*\]\([^)\s]+\)\s*$/.test(line) ||
        /^>\s?/.test(line) ||
        /^\s*[-*•]\s+/.test(line) ||
        /^\s*\d+[.)]\s+/.test(line)
    );
}
