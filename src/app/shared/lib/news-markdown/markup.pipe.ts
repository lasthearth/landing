import { Pipe, PipeTransform } from '@angular/core';
import { newsMarkdownToPlain } from './news-markdown-to-plain.function';
import { renderNewsMarkdown } from './render-news-markdown.function';

/**
 * Признак старого текста, сохранённого уже в HTML (до редактора разметки).
 */
const LEGACY_HTML = /<\/?(?:p|br|strong|em|b|i|u|s|ul|ol|li|h[1-6]|div|span|a|blockquote)\b[^>]*>/i;

/**
 * Выводит текст в разметке редактора: `html` — со всем оформлением,
 * `plain` — простым текстом для коротких превью.
 *
 * `<div [innerHTML]="text | markup"></div>`, `{{ text | markup: 'plain' }}`.
 */
@Pipe({ name: 'markup' })
export class MarkupPipe implements PipeTransform {
    /**
     * @param source Исходный текст.
     * @param mode Режим вывода.
     * @returns HTML или простой текст.
     */
    public transform(source: string | null | undefined, mode: 'html' | 'plain' = 'html'): string {
        if (!source) {
            return '';
        }

        // Старые тексты в HTML выводятся как есть (Angular их санитизирует).
        if (LEGACY_HTML.test(source)) {
            return mode === 'plain'
                ? source
                      .replace(/<[^>]*>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                : source;
        }

        return mode === 'plain' ? newsMarkdownToPlain(source) : renderNewsMarkdown(source);
    }
}
