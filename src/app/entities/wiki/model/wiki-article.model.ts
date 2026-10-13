/**
 * Модель статьи вики для компонентов.
 *
 * Здесь же и типы разметки: разбор текста статьи — часть статьи, а не
 * отдельной фичи.
 */

/**
 * Раздел вики.
 */
export type WikiSectionId = 'start' | 'settlements' | 'war' | 'economy' | 'world' | 'help';

/**
 * Статус статьи: черновик видят только редакторы.
 */
export type WikiStatus = 'draft' | 'published';

/**
 * Обложка статьи: картинка и какая её высота попадает в полосу.
 */
export interface WikiCover {
    readonly url: string;
    /**
     * Вертикаль `background-position`: `0%` — верх, `100%` — низ.
     */
    readonly focus: number;
}

/**
 * Короткий ответ для блока быстрых ответов.
 */
export interface WikiQuickAnswer {
    readonly question: string;
    readonly answer: string;
}

/**
 * Статья вики.
 */
export interface WikiArticle {
    readonly id: string;
    /**
     * Адрес статьи: `/wiki/<slug>`.
     */
    readonly slug: string;
    readonly title: string;
    readonly sectionId: WikiSectionId;
    /**
     * Вступление: под заголовком, в карточках и в описании для поисковиков.
     */
    readonly lead: string;
    readonly cover: WikiCover | null;
    readonly tags: readonly string[];
    /**
     * Для какой версии игры написано (пусто — неважно).
     */
    readonly gameVersion: string;
    readonly quickAnswer: WikiQuickAnswer | null;
    /**
     * «См. также»: адреса связанных статей.
     */
    readonly related: readonly string[];
    /**
     * Текст в разметке вики (см. `renderWikiMarkdown`).
     */
    readonly body: string;
    readonly status: WikiStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
    /**
     * Кто создал статью; не меняется при правках.
     */
    readonly createdBy: string;
    /**
     * Кто правил последним.
     */
    readonly authorName: string;
    /**
     * Версия из хранилища: правка принимается, только если статью не изменили
     * после того, как её открыли.
     */
    readonly version: number;
}

/**
 * Снимок статьи в истории правок.
 */
export interface WikiRevision {
    readonly id: string;
    readonly savedAt: string;
    readonly authorName: string;
    readonly note: string;
    readonly article: WikiArticle;
}

/**
 * Редактируемые поля статьи (форма редактора).
 */
export interface WikiDraft {
    readonly title: string;
    readonly slug: string;
    readonly sectionId: WikiSectionId | null;
    readonly lead: string;
    readonly cover: WikiCover | null;
    readonly tags: readonly string[];
    readonly gameVersion: string;
    readonly quickAnswer: WikiQuickAnswer | null;
    readonly related: readonly string[];
    readonly body: string;
}

/**
 * Заголовок в тексте — для оглавления.
 */
export interface WikiHeading {
    readonly id: string;
    readonly text: string;
    readonly level: 2 | 3 | 4 | 5;
    /**
     * Строка исходного текста (с нуля) — чтобы перейти к ней в редакторе.
     */
    readonly line: number;
}

/**
 * Картинка в тексте — для просмотра и списка картинок.
 */
export interface WikiImage {
    readonly url: string;
    readonly caption: string;
    readonly line: number;
}

/**
 * Замечание разборщика: то, что видно только при разборе текста.
 */
export interface WikiRenderNote {
    readonly kind:
        | 'unclosed'
        | 'unknownBlock'
        | 'badEmbed'
        | 'badImage'
        | 'missingFootnote'
        | 'unusedFootnote'
        | 'longParagraph'
        | 'badRule'
        | 'badPlayer';
    readonly line: number;
    readonly detail: string;
}

/**
 * Итог разбора текста статьи.
 */
export interface WikiRender {
    readonly html: string;
    readonly headings: readonly WikiHeading[];
    readonly images: readonly WikiImage[];
    /**
     * Адреса статей, на которые ссылается текст (с номером строки).
     */
    readonly articleLinks: readonly { slug: string; line: number }[];
    /**
     * Номера пунктов правил, на которые ссылается текст.
     */
    readonly ruleLinks: readonly string[];
    /**
     * Идентификаторы игроков, на которых ссылается текст.
     */
    readonly playerIds: readonly string[];
    readonly words: number;
    readonly notes: readonly WikiRenderNote[];
}

/**
 * Замечание проверки статьи.
 *
 * `error` не даёт опубликовать, `warning` — стоит поправить, `tip` — совет.
 */
export interface WikiIssue {
    readonly level: 'error' | 'warning' | 'tip';
    readonly code: string;
    readonly params?: Record<string, string | number>;
    readonly line?: number;
    readonly field?: keyof WikiDraft;
}
