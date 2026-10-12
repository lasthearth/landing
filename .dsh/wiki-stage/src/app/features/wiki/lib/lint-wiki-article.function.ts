import { WikiDraft, WikiIssue, WikiRender } from '../model/wiki-article';
import { isValidSlug } from './slugify.function';

/**
 * Пределы длины полей.
 */
export const WIKI_LIMITS = {
    title: 80,
    lead: 300,
    leadMin: 40,
    quickQuestion: 80,
    quickAnswer: 200,
    shortBody: 80,
    headingsFrom: 350,
} as const;

/**
 * Что известно о других статьях.
 */
export interface WikiLintContext {
    /**
     * Адрес занят другой статьёй.
     */
    readonly slugTaken: (slug: string) => boolean;
    /**
     * Статья с таким адресом существует.
     */
    readonly exists: (slug: string) => boolean;
}

/**
 * Проверяет статью перед публикацией.
 *
 * @param draft Поля статьи.
 * @param render Разбор текста.
 * @param context Сведения о других статьях.
 * @returns Замечания: сначала ошибки, потом предупреждения и советы.
 */
export function lintWikiArticle(draft: WikiDraft, render: WikiRender, context: WikiLintContext): WikiIssue[] {
    const issues: WikiIssue[] = [];
    const add = (issue: WikiIssue): void => {
        issues.push(issue);
    };

    // Поля.
    const title = draft.title.trim();

    if (!title) {
        add({ level: 'error', code: 'noTitle', field: 'title' });
    } else if (title.length > WIKI_LIMITS.title) {
        add({ level: 'warning', code: 'titleLong', field: 'title', params: { max: WIKI_LIMITS.title } });
    }

    if (!draft.sectionId) {
        add({ level: 'error', code: 'noSection', field: 'sectionId' });
    }

    if (!draft.slug) {
        add({ level: 'error', code: 'noSlug', field: 'slug' });
    } else if (!isValidSlug(draft.slug)) {
        add({ level: 'error', code: 'badSlug', field: 'slug' });
    } else if (context.slugTaken(draft.slug)) {
        add({ level: 'error', code: 'slugTaken', field: 'slug', params: { slug: draft.slug } });
    }

    if (!draft.body.trim()) {
        add({ level: 'error', code: 'noBody', field: 'body' });
    }

    const lead = draft.lead.trim();

    if (!lead) {
        add({ level: 'warning', code: 'noLead', field: 'lead' });
    } else if (lead.length > WIKI_LIMITS.lead) {
        add({ level: 'warning', code: 'leadLong', field: 'lead', params: { max: WIKI_LIMITS.lead } });
    } else if (lead.length < WIKI_LIMITS.leadMin) {
        add({ level: 'tip', code: 'leadShort', field: 'lead' });
    }

    if (draft.quickAnswer) {
        const { question, answer } = draft.quickAnswer;

        if (!question.trim() || !answer.trim()) {
            add({ level: 'warning', code: 'quickEmpty', field: 'quickAnswer' });
        } else if (answer.length > WIKI_LIMITS.quickAnswer) {
            add({ level: 'warning', code: 'quickLong', field: 'quickAnswer', params: { max: WIKI_LIMITS.quickAnswer } });
        }
    }

    for (const slug of draft.related) {
        if (!context.exists(slug)) {
            add({ level: 'warning', code: 'relatedMissing', field: 'related', params: { slug } });
        }
    }

    // Разбор текста.
    for (const note of render.notes) {
        const level = note.kind === 'unclosed' ? 'error' : note.kind === 'longParagraph' ? 'tip' : 'warning';
        add({ level, code: note.kind, line: note.line, params: { detail: note.detail } });
    }

    const seen = new Map<string, number>();
    let hadH2 = false;

    for (const heading of render.headings) {
        if (heading.level === 3 && !hadH2) {
            add({ level: 'warning', code: 'headingJump', line: heading.line, params: { text: heading.text } });
        }

        hadH2 ||= heading.level === 2;
        const key = heading.text.toLowerCase();

        if (seen.has(key)) {
            add({ level: 'warning', code: 'headingDuplicate', line: heading.line, params: { text: heading.text } });
        }

        seen.set(key, heading.line);
    }

    for (const image of render.images) {
        if (!image.caption) {
            add({ level: 'warning', code: 'imageNoCaption', line: image.line });
        }
    }

    const reported = new Set<string>();

    for (const link of render.articleLinks) {
        if (link.slug === draft.slug) {
            add({ level: 'tip', code: 'selfLink', line: link.line });
        } else if (!context.exists(link.slug) && !reported.has(link.slug)) {
            reported.add(link.slug);
            add({ level: 'warning', code: 'linkMissing', line: link.line, params: { slug: link.slug } });
        }
    }

    draft.body.split('\n').forEach((line, index) => {
        if (/\bTODO\b|\bЗАПОЛНИТЬ\b/.test(line)) {
            add({ level: 'warning', code: 'todo', line: index });
        }

        if (/(^|[^\w/])http:\/\//.test(line)) {
            add({ level: 'tip', code: 'httpLink', line: index });
        }
    });

    if (draft.body.trim()) {
        if (render.words < WIKI_LIMITS.shortBody) {
            add({ level: 'tip', code: 'shortBody', params: { words: render.words } });
        }

        if (render.words >= WIKI_LIMITS.headingsFrom && render.headings.length === 0) {
            add({ level: 'warning', code: 'noHeadings' });
        }
    }

    if (!draft.cover) {
        add({ level: 'tip', code: 'noCover', field: 'cover' });
    }

    if (!draft.tags.length) {
        add({ level: 'tip', code: 'noTags', field: 'tags' });
    }

    const order = { error: 0, warning: 1, tip: 2 };
    return issues.sort((a, b) => order[a.level] - order[b.level] || (a.line ?? -1) - (b.line ?? -1));
}
