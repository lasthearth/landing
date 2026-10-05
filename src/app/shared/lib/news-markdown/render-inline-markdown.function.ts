import { escapeHtml } from './escape-html.function';
import { sanitizeUrl } from './sanitize-url.function';

/**
 * Префикс внутренних ссылок: такие открываются в той же вкладке.
 */
const SITE_ORIGIN = 'https://lasthearth.ru';

/**
 * Собирает тег ссылки.
 *
 * @param url Проверенная ссылка.
 * @param label Уже отрендеренный текст ссылки.
 */
function buildLink(url: string, label: string): string {
    const isInternal = url.startsWith('/') || url.startsWith(SITE_ORIGIN);
    const attrs = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"';

    return `<a href="${escapeHtml(url)}"${attrs}>${label}</a>`;
}

/**
 * Превращает строчную разметку новости в HTML.
 *
 * Синтаксис совместим с Discord, чтобы один и тот же текст
 * одинаково выглядел на сайте и в канале новостей:
 * `**жирный**`, `*курсив*`, `__подчёркнутый__`, `~~зачёркнутый~~`,
 * `||спойлер||`, `` `код` ``, `[текст](https://…)` и голые ссылки.
 *
 * Весь пользовательский текст экранируется, поэтому HTML, набранный вручную,
 * показывается как текст и не может внедрить разметку.
 *
 * @param source Исходная строка (без переводов строк или с ними).
 * @returns HTML.
 */
export function renderInlineMarkdown(source: string): string {
    const tokens: string[] = [];
    const hold = (html: string): string => `\u0000${tokens.push(html) - 1}\u0000`;

    let text = source;

    // 1. Код — содержимое не форматируется.
    text = text.replace(/`([^`\n]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

    // 2. Ссылки [текст](url).
    text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
        const safe = sanitizeUrl(url);
        return safe ? hold(buildLink(safe, renderInlineMarkdown(label))) : match;
    });

    // 3. Голые ссылки.
    text = text.replace(/https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»]/gi, (url) => hold(buildLink(url, escapeHtml(url))));

    // 4. Остальное экранируется и форматируется.
    let html = escapeHtml(text)
        .replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>')
        .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
        .replace(/~~([^~\n]+?)~~/g, '<s>$1</s>')
        .replace(/\|\|([^|\n]+?)\|\|/g, '<span class="lh-spoiler" tabindex="0">$1</span>')
        .replace(/(^|[^*\w])\*(?![\s*])([^*\n]*?[^\s*])\*(?![*\w])/g, '$1<i>$2</i>');

    // 5. Возвращаем защищённые фрагменты (с учётом вложенности).
    while (html.includes('\u0000')) {
        html = html.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)]);
    }

    return html;
}
