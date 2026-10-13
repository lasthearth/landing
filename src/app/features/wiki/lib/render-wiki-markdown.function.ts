import { escapeHtml } from '@shared/lib/news-markdown/escape-html.function';
import { renderInlineMarkdown, sanitizeUrl } from '@shared/lib/news-markdown';
import { WikiHeading, WikiImage, WikiRender, WikiRenderNote } from '@entities/wiki';
import { slugify } from './slugify.function';

/**
 * Подписи, которые разборщик подставляет сам (зависят от языка интерфейса).
 */
export interface WikiRenderLabels {
    readonly details: string;
    readonly compareBad: string;
    readonly compareGood: string;
    readonly footnotes: string;
    readonly copy: string;
    readonly video: string;
    readonly missingArticle: string;
}

/**
 * Настройки разбора.
 */
export interface WikiRenderOptions {
    /**
     * Заголовок статьи по адресу; `null` — такой статьи нет (ссылка станет «красной»).
     * Без функции все ссылки считаются рабочими.
     */
    readonly resolveArticle?: (slug: string) => string | null;
    readonly labels?: Partial<WikiRenderLabels>;
}

/**
 * Подписи по умолчанию.
 */
const DEFAULT_LABELS: WikiRenderLabels = {
    details: 'Подробнее',
    compareBad: 'Так не надо',
    compareGood: 'Так надо',
    footnotes: 'Примечания',
    copy: 'Копировать',
    video: 'Смотреть видео',
    missingArticle: 'Статьи пока нет',
};

/**
 * Виды выносок `:::вид`.
 */
const CALLOUTS = ['tip', 'info', 'warn', 'danger'] as const;

/**
 * Все известные блоки `:::имя`.
 */
export const WIKI_BLOCKS = [...CALLOUTS, 'details', 'gallery', 'columns', 'compare', 'steps'] as const;

/**
 * Модификаторы картинки `{left}` и т. п.
 */
const IMAGE_MODS = new Set(['left', 'right', 'wide', 'small', 'center']);

/**
 * Иконки (контуры Lucide) для HTML, который вставляется через innerHTML.
 */
const ICONS: Record<string, string> = {
    tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    danger: '<path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    cross: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    play: '<path d="M6 3v18l15-9z"/>',
};

/**
 * SVG-иконка.
 *
 * @param name Имя из {@link ICONS}.
 */
function icon(name: string): string {
    return `<svg class="wiki-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

const RE = {
    blank: /^\s*$/,
    fence: /^\s*```\s*([\w+#-]{0,20})\s*$/,
    open: /^:::\s*([a-z]+)\s*(.*)$/,
    close: /^:::\s*$/,
    heading: /^(#{1,5})\s+(.+?)\s*#*\s*$/,
    hr: /^\s*(-{3,}|\*{3,}|_{3,})\s*$/,
    image: /^\s*!\[([^\]\n]*)\]\(([^)\s]+)\)\s*(?:\{([a-z\s]+)\})?\s*$/,
    embed: /^\s*@(youtube|video)\(([^)\s]*)\)\s*$/,
    table: /^\s*\|(?!\|)/,
    tableSep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
    quote: /^>\s?(.*)$/,
    list: /^(\s*)([-*•]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/,
    footnoteDef: /^\[\^([\w-]{1,40})\]:\s*(.*)$/,
    columnBreak: /^\s*\+\+\+\s*$/,
    step: /^(\d+)[.)]\s+(.*)$/,
};

/**
 * Состояние одного разбора.
 */
interface Ctx {
    readonly lines: readonly string[];
    readonly labels: WikiRenderLabels;
    readonly resolve: ((slug: string) => string | null) | null;
    readonly headings: WikiHeading[];
    readonly images: WikiImage[];
    readonly articleLinks: { slug: string; line: number }[];
    readonly ruleLinks: Set<string>;
    readonly notes: WikiRenderNote[];
    readonly ids: Map<string, number>;
    /**
     * Пояснения сносок по имени: текст и строка.
     */
    readonly footnoteDefs: Map<string, { text: string; line: number }>;
    /**
     * Имена сносок в порядке первого упоминания.
     */
    readonly footnoteOrder: string[];
}

/**
 * Превращает текст статьи вики в HTML и собирает сведения для редактора.
 *
 * Синтаксис — разметка новостей (см. `renderInlineMarkdown`) плюс:
 * - `## ` … `##### ` — заголовки с якорями (для оглавления);
 * - `- [ ]` / `- [x]` — чек-лист, вложенные списки отступом;
 * - `![подпись](url){left|right|wide|small|center}` — картинка;
 * - `:::tip|info|warn|danger Заголовок … :::` — выноска;
 * - `:::details Заголовок`, `:::gallery`, `:::steps`, `:::columns` / `:::compare` (колонки через `+++`);
 * - таблицы `| a | b |`, блоки кода ```` ``` ````, `@youtube(ссылка)`;
 * - `[[адрес]]`, `[[адрес#раздел|текст]]`, `[[#раздел]]`, `[[rule:5.2]]`, `[[kbd:Ctrl+C]]`;
 * - `==выделение==`, сноски `[^1]` с пояснением `[^1]: текст`.
 *
 * Весь пользовательский текст экранируется, ссылки проходят `sanitizeUrl`,
 * а адреса, якоря и id роликов проверяются шаблонами — поэтому результат
 * можно вставлять без санитайзера Angular (он вырезал бы SVG и data-атрибуты).
 *
 * @param source Текст статьи.
 * @param options Поиск статей и подписи.
 */
export function renderWikiMarkdown(source: string, options: WikiRenderOptions = {}): WikiRender {
    const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
    const ctx: Ctx = {
        lines,
        labels: { ...DEFAULT_LABELS, ...options.labels },
        resolve: options.resolveArticle ?? null,
        headings: [],
        images: [],
        articleLinks: [],
        ruleLinks: new Set(),
        notes: [],
        ids: new Map(),
        footnoteDefs: new Map(),
        footnoteOrder: [],
    };

    collectFootnotes(ctx);

    let html = renderBlocks(ctx, 0, lines.length, true);
    html += renderFootnotes(ctx);

    for (const [name, def] of ctx.footnoteDefs) {
        if (!ctx.footnoteOrder.includes(name)) {
            ctx.notes.push({ kind: 'unusedFootnote', line: def.line, detail: name });
        }
    }

    return {
        html,
        headings: ctx.headings,
        images: ctx.images,
        articleLinks: ctx.articleLinks,
        ruleLinks: [...ctx.ruleLinks],
        words: countWords(source),
        notes: ctx.notes.sort((a, b) => a.line - b.line),
    };
}

/**
 * Находит пояснения сносок (вне блоков кода).
 *
 * @param ctx Состояние разбора.
 */
function collectFootnotes(ctx: Ctx): void {
    let inCode = false;

    ctx.lines.forEach((line, index) => {
        if (RE.fence.test(line)) {
            inCode = !inCode;
            return;
        }

        const def = inCode ? null : RE.footnoteDef.exec(line);

        if (def && !ctx.footnoteDefs.has(def[1])) {
            ctx.footnoteDefs.set(def[1], { text: def[2], line: index });
        }
    });
}

/**
 * Атрибут строки исходника — для синхронной прокрутки и перехода из просмотра.
 *
 * @param top Блок верхнего уровня.
 * @param line Строка.
 */
function lineAttr(top: boolean, line: number): string {
    return top ? ` data-line="${line}"` : '';
}

/**
 * Ищет строку, закрывающую блок `:::`, с учётом вложенных блоков.
 *
 * @returns Номер строки `:::` или -1.
 */
function findClose(ctx: Ctx, from: number, to: number): number {
    let depth = 0;
    let inCode = false;

    for (let index = from; index < to; index++) {
        const line = ctx.lines[index];

        if (RE.fence.test(line)) {
            inCode = !inCode;
            continue;
        }

        if (inCode) {
            continue;
        }

        if (RE.open.test(line)) {
            depth++;
        } else if (RE.close.test(line)) {
            if (depth === 0) {
                return index;
            }
            depth--;
        }
    }

    return -1;
}

/**
 * Начинается ли со строки новый блок.
 *
 * @param line Строка.
 */
function isBlockStart(line: string): boolean {
    return (
        RE.fence.test(line) ||
        RE.open.test(line) ||
        RE.close.test(line) ||
        RE.heading.test(line) ||
        RE.hr.test(line) ||
        RE.image.test(line) ||
        RE.embed.test(line) ||
        RE.table.test(line) ||
        RE.quote.test(line) ||
        RE.list.test(line) ||
        RE.footnoteDef.test(line) ||
        RE.columnBreak.test(line)
    );
}

/**
 * Разбирает строки `[from, to)` в HTML.
 *
 * @param ctx Состояние разбора.
 * @param from Первая строка.
 * @param to Строка после последней.
 * @param top Верхний уровень статьи (заголовки идут в оглавление).
 */
function renderBlocks(ctx: Ctx, from: number, to: number, top: boolean): string {
    const { lines } = ctx;
    const out: string[] = [];
    let index = from;

    while (index < to) {
        const line = lines[index];
        const start = index;

        if (RE.blank.test(line) || RE.footnoteDef.test(line) || RE.columnBreak.test(line)) {
            index++;
            continue;
        }

        // Блок кода.
        const fence = RE.fence.exec(line);

        if (fence) {
            let end = index + 1;

            while (end < to && !/^\s*```\s*$/.test(lines[end])) {
                end++;
            }

            if (end >= to) {
                ctx.notes.push({ kind: 'unclosed', line: start, detail: '```' });
            }

            const lang = fence[1];
            const code = lines.slice(index + 1, Math.min(end, to)).join('\n');
            const langLabel = lang ? `<span class="wiki-code__lang">${escapeHtml(lang)}</span>` : '';
            out.push(
                `<div class="wiki-code"${lineAttr(top, start)}>${langLabel}` +
                    `<button type="button" class="wiki-code__copy" title="${escapeHtml(ctx.labels.copy)}" aria-label="${escapeHtml(ctx.labels.copy)}">${icon('copy')}</button>` +
                    `<pre><code>${escapeHtml(code)}</code></pre></div>`
            );
            index = end + 1;
            continue;
        }

        // Контейнер :::имя.
        const open = RE.open.exec(line);

        if (open) {
            let close = findClose(ctx, index + 1, to);

            if (close === -1) {
                ctx.notes.push({ kind: 'unclosed', line: start, detail: `:::${open[1]}` });
                close = to;
            }

            out.push(renderContainer(ctx, open[1], open[2].trim(), start, close, top));
            index = close + 1;
            continue;
        }

        // Лишнее закрытие — показываем как текст.
        if (RE.close.test(line)) {
            out.push(`<p${lineAttr(top, start)}>${escapeHtml(line)}</p>`);
            index++;
            continue;
        }

        const heading = RE.heading.exec(line);

        if (heading) {
            const level = Math.max(2, heading[1].length) as WikiHeading['level'];
            const text = heading[2];
            const id = uniqueId(ctx, slugify(plainText(text)) || 'section');

            if (top) {
                ctx.headings.push({ id, text: plainText(text), level, line: start });
            }

            out.push(
                `<h${level} id="${id}" class="wiki-h"${lineAttr(top, start)}>${renderInline(ctx, text, start)}` +
                    `<a class="wiki-h__anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a></h${level}>`
            );
            index++;
            continue;
        }

        if (RE.hr.test(line)) {
            out.push(`<hr${lineAttr(top, start)}>`);
            index++;
            continue;
        }

        const image = RE.image.exec(line);

        if (image) {
            const figure = renderFigure(ctx, image, start);

            if (figure) {
                out.push(figure.replace('<figure', `<figure${lineAttr(top, start)}`));
                index++;
                continue;
            }
        }

        const embed = RE.embed.exec(line);

        if (embed) {
            const id = youtubeId(embed[2]);

            if (id) {
                out.push(
                    `<button type="button" class="wiki-video" data-yt="${id}"${lineAttr(top, start)} ` +
                        `style="background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)" aria-label="${escapeHtml(ctx.labels.video)}">` +
                        `<span class="wiki-video__play">${icon('play')}</span></button>`
                );
            } else {
                ctx.notes.push({ kind: 'badEmbed', line: start, detail: embed[2] });
                out.push(`<p${lineAttr(top, start)}>${escapeHtml(line)}</p>`);
            }

            index++;
            continue;
        }

        if (RE.table.test(line)) {
            let end = index;

            while (end < to && RE.table.test(lines[end])) {
                end++;
            }

            out.push(renderTable(ctx, index, end, top));
            index = end;
            continue;
        }

        if (RE.quote.test(line)) {
            const parts: string[] = [];

            while (index < to && RE.quote.test(lines[index])) {
                parts.push(renderInline(ctx, RE.quote.exec(lines[index])![1], index));
                index++;
            }

            out.push(`<blockquote${lineAttr(top, start)}>${parts.join('<br>')}</blockquote>`);
            continue;
        }

        if (RE.list.test(line)) {
            const items: ListItem[] = [];

            while (index < to) {
                const match = RE.list.exec(lines[index]);

                if (match) {
                    items.push({
                        indent: match[1].length,
                        ordered: /\d/.test(match[2]),
                        number: parseInt(match[2], 10) || 1,
                        task: match[3] === undefined ? null : match[3] !== ' ',
                        parts: [match[4]],
                        line: index,
                    });
                    index++;
                    continue;
                }

                // Продолжение пункта: строка с отступом.
                if (items.length && /^\s{2,}\S/.test(lines[index]) && !isBlockStart(lines[index].trim())) {
                    items[items.length - 1].parts.push(lines[index].trim());
                    index++;
                    continue;
                }

                break;
            }

            const [html] = renderList(ctx, items, 0);
            out.push(html.replace(/^<(ul|ol)/, `<$1${lineAttr(top, start)}`));
            continue;
        }

        // Абзац.
        const paragraph: string[] = [];

        while (index < to && !RE.blank.test(lines[index]) && (paragraph.length === 0 || !isBlockStart(lines[index]))) {
            paragraph.push(lines[index]);
            index++;
        }

        const length = paragraph.join(' ').length;

        if (length > 1200) {
            ctx.notes.push({ kind: 'longParagraph', line: start, detail: String(length) });
        }

        out.push(
            `<p${lineAttr(top, start)}>${paragraph.map((item) => renderInline(ctx, item, start)).join('<br>')}</p>`
        );
    }

    return out.join('');
}

/**
 * Блок `:::имя`.
 *
 * @param name Имя блока.
 * @param title Текст после имени.
 * @param open Строка открытия.
 * @param close Строка закрытия.
 */
function renderContainer(ctx: Ctx, name: string, title: string, open: number, close: number, top: boolean): string {
    const attr = lineAttr(top, open);
    const inner = (): string => renderBlocks(ctx, open + 1, close, false);

    if ((CALLOUTS as readonly string[]).includes(name)) {
        const head = title ? `<div class="wiki-callout__title">${renderInline(ctx, title, open)}</div>` : '';
        return (
            `<div class="wiki-callout wiki-callout--${name}"${attr}>` +
            `<span class="wiki-callout__icon">${icon(name)}</span><div class="wiki-callout__body">${head}${inner()}</div></div>`
        );
    }

    switch (name) {
        case 'details':
            return (
                `<details class="wiki-details"${attr}><summary>${title ? renderInline(ctx, title, open) : escapeHtml(ctx.labels.details)}</summary>` +
                `<div class="wiki-details__body">${inner()}</div></details>`
            );
        case 'gallery': {
            const figures: string[] = [];

            for (let index = open + 1; index < close; index++) {
                const image = RE.image.exec(ctx.lines[index]);
                const figure = image ? renderFigure(ctx, image, index, true) : null;

                if (figure) {
                    figures.push(figure);
                }
            }

            return `<div class="wiki-gallery"${attr}>${figures.join('')}</div>`;
        }
        case 'columns':
        case 'compare': {
            const columns = splitColumns(ctx, open + 1, close);
            const compare = name === 'compare';
            const cells = columns.map(([from, to], position) => {
                const head = compare
                    ? `<div class="wiki-col__head">${icon(position === 0 ? 'cross' : 'check')}${escapeHtml(
                          position === 0 ? ctx.labels.compareBad : ctx.labels.compareGood
                      )}</div>`
                    : '';
                const mood = compare ? (position === 0 ? ' wiki-col--bad' : ' wiki-col--good') : '';
                return `<div class="wiki-col${mood}">${head}${renderBlocks(ctx, from, to, false)}</div>`;
            });
            const heading = title ? `<div class="wiki-columns__title">${renderInline(ctx, title, open)}</div>` : '';
            return `<div class="wiki-columns wiki-columns--${Math.min(columns.length, 4)}"${attr}>${heading}${cells.join('')}</div>`;
        }
        case 'steps':
            return renderSteps(ctx, open, close, attr, title);
        default:
            ctx.notes.push({ kind: 'unknownBlock', line: open, detail: name });
            return `<div class="wiki-box"${attr}>${inner()}</div>`;
    }
}

/**
 * Делит содержимое блока на колонки по строкам `+++`.
 *
 * @returns Диапазоны строк колонок.
 */
function splitColumns(ctx: Ctx, from: number, to: number): [number, number][] {
    const ranges: [number, number][] = [];
    let start = from;
    let depth = 0;

    for (let index = from; index < to; index++) {
        const line = ctx.lines[index];

        if (RE.open.test(line)) {
            depth++;
        } else if (RE.close.test(line)) {
            depth--;
        } else if (depth === 0 && RE.columnBreak.test(line)) {
            ranges.push([start, index]);
            start = index + 1;
        }
    }

    ranges.push([start, to]);
    return ranges;
}

/**
 * Блок шагов: `1. Заголовок шага`, ниже — его содержимое до следующего номера.
 */
function renderSteps(ctx: Ctx, open: number, close: number, attr: string, title: string): string {
    const steps: { line: number; title: string; from: number; to: number }[] = [];

    for (let index = open + 1; index < close; index++) {
        const match = RE.step.exec(ctx.lines[index]);

        if (match) {
            if (steps.length) {
                steps[steps.length - 1].to = index;
            }
            steps.push({ line: index, title: match[2], from: index + 1, to: close });
        }
    }

    const items = steps.map(
        (step) =>
            `<li class="wiki-step"><div class="wiki-step__title">${renderInline(ctx, step.title, step.line)}</div>` +
            `<div class="wiki-step__body">${renderBlocks(ctx, step.from, step.to, false)}</div></li>`
    );
    const heading = title ? `<div class="wiki-steps__title">${renderInline(ctx, title, open)}</div>` : '';

    return `<div class="wiki-steps"${attr}>${heading}<ol>${items.join('')}</ol></div>`;
}

/**
 * Картинка с подписью.
 *
 * @param match Результат {@link RE.image}.
 * @param line Строка.
 * @param inGallery Картинка галереи (без модификаторов размера).
 * @returns HTML или null, если ссылка небезопасна.
 */
function renderFigure(ctx: Ctx, match: RegExpExecArray, line: number, inGallery = false): string | null {
    const url = sanitizeUrl(match[2]);

    if (!url) {
        ctx.notes.push({ kind: 'badImage', line, detail: match[2] });
        return null;
    }

    const caption = match[1].trim();
    const mods = inGallery
        ? []
        : (match[3] ?? '')
              .split(/\s+/)
              .filter((mod) => IMAGE_MODS.has(mod))
              .map((mod) => ` wiki-fig--${mod}`);
    const index = ctx.images.push({ url, caption, line }) - 1;
    const figcaption = caption ? `<figcaption>${renderInline(ctx, caption, line)}</figcaption>` : '';

    return (
        `<figure class="wiki-fig${mods.join('')}"><img src="${escapeHtml(url)}" alt="${escapeHtml(plainText(caption))}" ` +
        `loading="lazy" data-wiki-img="${index}">${figcaption}</figure>`
    );
}

/**
 * Пункт списка.
 */
interface ListItem {
    readonly indent: number;
    readonly ordered: boolean;
    readonly number: number;
    readonly task: boolean | null;
    readonly parts: string[];
    readonly line: number;
}

/**
 * Список с вложенностью по отступам.
 *
 * @param items Все пункты подряд.
 * @param from Первый пункт этого уровня.
 * @returns HTML и индекс пункта после списка.
 */
function renderList(ctx: Ctx, items: readonly ListItem[], from: number): [string, number] {
    const first = items[from];
    const base = first.indent;
    const lis: string[] = [];
    let index = from;
    let hasTasks = false;

    while (index < items.length && items[index].indent >= base) {
        const item = items[index];
        index++;

        let nested = '';

        if (index < items.length && items[index].indent > base) {
            const [html, next] = renderList(ctx, items, index);
            nested = html;
            index = next;
        }

        const text = item.parts.map((part) => renderInline(ctx, part, item.line)).join('<br>');

        if (item.task !== null) {
            hasTasks = true;
            lis.push(
                `<li class="wiki-task${item.task ? ' wiki-task--done' : ''}"><span class="wiki-task__box">${item.task ? icon('check') : ''}</span>` +
                    `<span class="wiki-task__text">${text}</span>${nested}</li>`
            );
        } else {
            lis.push(`<li>${text}${nested}</li>`);
        }
    }

    const tag = first.ordered ? 'ol' : 'ul';
    const startAttr = first.ordered && first.number !== 1 ? ` start="${first.number}"` : '';
    const cls = hasTasks ? ' class="wiki-tasks"' : '';

    return [`<${tag}${cls}${startAttr}>${lis.join('')}</${tag}>`, index];
}

/**
 * Делит строку таблицы на ячейки: `|` внутри `[[…]]`, кода и после `\` не делит.
 *
 * @param row Строка таблицы.
 */
function splitRow(row: string): string[] {
    const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
    const cells: string[] = [];
    let cell = '';
    let wiki = 0;
    let code = false;

    for (let index = 0; index < trimmed.length; index++) {
        const char = trimmed[index];
        const pair = trimmed.slice(index, index + 2);

        if (char === '\\' && trimmed[index + 1] === '|') {
            cell += '|';
            index++;
            continue;
        }

        if (char === '`') {
            code = !code;
        } else if (!code && pair === '[[') {
            wiki++;
        } else if (!code && pair === ']]' && wiki > 0) {
            wiki--;
        } else if (char === '|' && !code && wiki === 0) {
            cells.push(cell.trim());
            cell = '';
            continue;
        }

        cell += char;
    }

    cells.push(cell.trim());
    return cells;
}

/**
 * Таблица: первая строка — шапка, если под ней разделитель `|---|:--:|`.
 */
function renderTable(ctx: Ctx, from: number, to: number, top: boolean): string {
    const rows = ctx.lines.slice(from, to);
    const hasHead = rows.length > 1 && RE.tableSep.test(rows[1]);
    const aligns = hasHead
        ? splitRow(rows[1]).map((cell) =>
              cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : ''
          )
        : [];
    const cell = (tag: 'th' | 'td', text: string, column: number, line: number): string => {
        const align = aligns[column] ? ` style="text-align:${aligns[column]}"` : '';
        return `<${tag}${align}>${renderInline(ctx, text, line)}</${tag}>`;
    };

    const head = hasHead
        ? `<thead><tr>${splitRow(rows[0])
              .map((text, column) => cell('th', text, column, from))
              .join('')}</tr></thead>`
        : '';
    const body = rows
        .map((row, offset) => ({ row, line: from + offset }))
        .slice(hasHead ? 2 : 0)
        .map(
            ({ row, line }) =>
                `<tr>${splitRow(row)
                    .map((text, column) => cell('td', text, column, line))
                    .join('')}</tr>`
        )
        .join('');

    return `<div class="wiki-table"${lineAttr(top, from)}><table>${head}<tbody>${body}</tbody></table></div>`;
}

/**
 * Строчная разметка: разметка новостей плюс вики-ссылки, `==выделение==` и сноски.
 *
 * @param text Строка.
 * @param line Строка исходника (для замечаний).
 */
function renderInline(ctx: Ctx, text: string, line: number): string {
    const held: string[] = [];
    const hold = (html: string): string => `\u0001${held.push(html) - 1}\u0001`;
    let source = text;

    // Код — первым, чтобы `[[…]]` внутри него остался текстом.
    source = source.replace(/`([^`\n]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));
    source = source.replace(/\[\[([^\]\n]+?)\]\]/g, (match, inner: string) => {
        const html = renderWikiLink(ctx, inner.trim(), line);
        return html ? hold(html) : match;
    });
    source = source.replace(/\[\^([\w-]{1,40})\]/g, (match, name: string) => {
        if (!ctx.footnoteDefs.has(name)) {
            ctx.notes.push({ kind: 'missingFootnote', line, detail: name });
            return match;
        }

        if (!ctx.footnoteOrder.includes(name)) {
            ctx.footnoteOrder.push(name);
        }

        const number = ctx.footnoteOrder.indexOf(name) + 1;
        return hold(`<sup class="wiki-fn"><a href="#fn-${name}" id="fnref-${name}">${number}</a></sup>`);
    });
    source = source.replace(/==([^=\n]+?)==/g, '\u0002$1\u0003');

    let html = renderInlineMarkdown(source)
        .replace(/\u0002/g, '<mark>')
        .replace(/\u0003/g, '</mark>');

    while (html.includes('\u0001')) {
        html = html.replace(/\u0001(\d+)\u0001/g, (_, index: string) => held[Number(index)]);
    }

    return html;
}

/**
 * Ссылка `[[…]]`.
 *
 * @param inner Текст между скобками.
 * @returns HTML или null, если ссылка не разобралась.
 */
function renderWikiLink(ctx: Ctx, inner: string, line: number): string | null {
    const pipe = inner.indexOf('|');
    const target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
    const label = pipe === -1 ? '' : inner.slice(pipe + 1).trim();

    const rule = /^rule:\s*(.+)$/i.exec(target);

    if (rule) {
        const number = rule[1].trim().replace(/^§\s*/, '');

        if (!/^\d+(\.\d+){0,3}$/.test(number)) {
            ctx.notes.push({ kind: 'badRule', line, detail: number });
            return null;
        }

        ctx.ruleLinks.add(number);
        const text = label ? renderInlineMarkdown(label) : `§&nbsp;${number}`;
        return `<a class="wiki-rule" href="/rules#P${number.replace(/\./g, '_')}" target="_blank" rel="noopener">${text}</a>`;
    }

    const kbd = /^kbd:\s*(.+)$/i.exec(target);

    if (kbd) {
        return kbd[1]
            .split('+')
            .map((key) => `<kbd>${escapeHtml(key.trim())}</kbd>`)
            .join('<span class="wiki-kbd-plus">+</span>');
    }

    const hash = target.indexOf('#');
    const page = (hash === -1 ? target : target.slice(0, hash)).trim();
    const anchor = hash === -1 ? '' : slugify(target.slice(hash + 1));

    // Якорь в этой же статье.
    if (!page) {
        if (!anchor) {
            return null;
        }
        return `<a class="wiki-link wiki-link--anchor" href="#${anchor}">${label ? renderInlineMarkdown(label) : escapeHtml(target.slice(1))}</a>`;
    }

    const slug = /^[a-z0-9-]+$/.test(page) ? page : slugify(page);

    if (!slug) {
        return null;
    }

    ctx.articleLinks.push({ slug, line });

    const title = ctx.resolve ? ctx.resolve(slug) : page;
    const missing = ctx.resolve !== null && title === null;
    const text = label ? renderInlineMarkdown(label) : escapeHtml(title ?? page);
    const hrefAnchor = anchor ? `#${anchor}` : '';
    const hint = missing ? ` title="${escapeHtml(ctx.labels.missingArticle)}"` : '';

    return `<a class="wiki-link${missing ? ' wiki-link--missing' : ''}" href="/wiki/${slug}${hrefAnchor}"${hint}>${text}</a>`;
}

/**
 * Список пояснений к сноскам в конце статьи.
 */
function renderFootnotes(ctx: Ctx): string {
    if (!ctx.footnoteOrder.length) {
        return '';
    }

    const items = ctx.footnoteOrder.map((name) => {
        const def = ctx.footnoteDefs.get(name)!;
        return `<li id="fn-${name}" data-line="${def.line}">${renderInline(ctx, def.text, def.line)} <a class="wiki-fn__back" href="#fnref-${name}" aria-label="↑">↩</a></li>`;
    });

    return `<section class="wiki-footnotes"><div class="wiki-footnotes__title">${escapeHtml(ctx.labels.footnotes)}</div><ol>${items.join('')}</ol></section>`;
}

/**
 * Якорь без повторов: `boi`, `boi-2`, `boi-3`.
 *
 * @param base Желаемый якорь.
 */
function uniqueId(ctx: Ctx, base: string): string {
    const count = (ctx.ids.get(base) ?? 0) + 1;
    ctx.ids.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
}

/**
 * Id ролика YouTube из ссылки (watch, youtu.be, shorts, embed) или голого id.
 *
 * @param url Ссылка.
 * @returns 11 символов id или null.
 */
export function youtubeId(url: string): string | null {
    const match =
        /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i.exec(
            url.trim()
        ) ?? /^([\w-]{11})$/.exec(url.trim());

    return match ? match[1] : null;
}

/**
 * Текст без разметки — для оглавления и подписей.
 *
 * @param text Строка с разметкой.
 */
export function plainText(text: string): string {
    return text
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[\^[\w-]+\]/g, '')
        .replace(/(\*\*|__|~~|==|\|\||`)/g, '')
        .replace(/(^|[^*\w])\*(\S[^*]*?)\*(?!\w)/g, '$1$2')
        .replace(/^(rule|kbd):/i, '')
        .trim();
}

/**
 * Число слов в тексте без служебных строк и ссылок.
 *
 * @param source Текст статьи.
 */
function countWords(source: string): number {
    const text = source
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^:::.*$/gm, ' ')
        .replace(/^@\w+\(.*\)$/gm, ' ')
        .replace(/\]\([^)]*\)/g, ']')
        .replace(/https?:\/\/\S+/g, ' ');

    return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
