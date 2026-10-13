/**
 * Действие редактора вики.
 */
export type WikiCommandId =
    | 'undo'
    | 'redo'
    | 'h2'
    | 'h3'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strike'
    | 'highlight'
    | 'code'
    | 'spoiler'
    | 'dash'
    | 'nbsp'
    | 'link'
    | 'wikiLink'
    | 'anchorLink'
    | 'ruleLink'
    | 'kbd'
    | 'footnote'
    | 'list'
    | 'orderedList'
    | 'checklist'
    | 'quote'
    | 'tip'
    | 'info'
    | 'warn'
    | 'danger'
    | 'details'
    | 'steps'
    | 'compare'
    | 'columns'
    | 'table'
    | 'codeBlock'
    | 'divider'
    | 'image'
    | 'imageUrl'
    | 'gallery'
    | 'youtube'
    | 'find';

/**
 * Описание действия: подпись — `wiki.cmd.<id>`, пояснение в меню «/» — `wiki.cmdHint.<id>`.
 */
export interface WikiCommand {
    readonly id: WikiCommandId;
    readonly icon: string;
    /**
     * Сочетание клавиш для подсказки (обработка — в поле ввода).
     */
    readonly hotkey?: string;
    /**
     * Есть в меню «/» (вставка блока с новой строки).
     */
    readonly slash?: boolean;
    /**
     * Слова для поиска в меню «/» (оба языка).
     */
    readonly keywords?: string;
}

/**
 * Все действия.
 */
export const WIKI_COMMANDS: Record<WikiCommandId, WikiCommand> = {
    undo: { id: 'undo', icon: '@tui.undo-2', hotkey: 'Ctrl+Z' },
    redo: { id: 'redo', icon: '@tui.redo-2', hotkey: 'Ctrl+Y' },
    h2: {
        id: 'h2',
        icon: '@tui.heading-2',
        hotkey: 'Ctrl+Alt+2',
        slash: true,
        keywords: 'заголовок раздел heading h2',
    },
    h3: { id: 'h3', icon: '@tui.heading-3', hotkey: 'Ctrl+Alt+3', slash: true, keywords: 'подзаголовок heading h3' },
    bold: { id: 'bold', icon: '@tui.bold', hotkey: 'Ctrl+B' },
    italic: { id: 'italic', icon: '@tui.italic', hotkey: 'Ctrl+I' },
    underline: { id: 'underline', icon: '@tui.underline', hotkey: 'Ctrl+U' },
    strike: { id: 'strike', icon: '@tui.strikethrough', hotkey: 'Ctrl+Shift+S' },
    highlight: { id: 'highlight', icon: '@tui.highlighter', hotkey: 'Ctrl+Shift+H' },
    code: { id: 'code', icon: '@tui.code', hotkey: 'Ctrl+E' },
    spoiler: { id: 'spoiler', icon: '@tui.eye-off' },
    dash: { id: 'dash', icon: '@tui.move-horizontal' },
    nbsp: { id: 'nbsp', icon: '@tui.space' },
    link: { id: 'link', icon: '@tui.link', hotkey: 'Ctrl+K' },
    wikiLink: {
        id: 'wikiLink',
        icon: '@tui.book-open',
        hotkey: 'Ctrl+Shift+K',
        slash: true,
        keywords: 'статья ссылка вики article wiki link',
    },
    anchorLink: { id: 'anchorLink', icon: '@tui.hash', slash: true, keywords: 'якорь раздел anchor section' },
    ruleLink: { id: 'ruleLink', icon: '@tui.scale', slash: true, keywords: 'правило пункт rule' },
    kbd: { id: 'kbd', icon: '@tui.keyboard', slash: true, keywords: 'клавиша кнопка key keyboard' },
    footnote: { id: 'footnote', icon: '@tui.superscript', slash: true, keywords: 'сноска примечание footnote note' },
    list: {
        id: 'list',
        icon: '@tui.list',
        hotkey: 'Ctrl+Shift+8',
        slash: true,
        keywords: 'список маркированный list bullet',
    },
    orderedList: {
        id: 'orderedList',
        icon: '@tui.list-ordered',
        hotkey: 'Ctrl+Shift+7',
        slash: true,
        keywords: 'нумерованный список ordered',
    },
    checklist: {
        id: 'checklist',
        icon: '@tui.list-checks',
        hotkey: 'Ctrl+Shift+9',
        slash: true,
        keywords: 'чеклист задачи checklist todo',
    },
    quote: { id: 'quote', icon: '@tui.quote', slash: true, keywords: 'цитата quote' },
    tip: { id: 'tip', icon: '@tui.lightbulb', slash: true, keywords: 'совет выноска tip callout' },
    info: { id: 'info', icon: '@tui.info', slash: true, keywords: 'инфо справка выноска info callout' },
    warn: { id: 'warn', icon: '@tui.triangle-alert', slash: true, keywords: 'осторожно внимание warning callout' },
    danger: { id: 'danger', icon: '@tui.octagon-x', slash: true, keywords: 'запрещено опасно danger callout' },
    details: {
        id: 'details',
        icon: '@tui.square-chevron-down',
        slash: true,
        keywords: 'скрытый спойлер раскрыть details collapse',
    },
    steps: { id: 'steps', icon: '@tui.footprints', slash: true, keywords: 'шаги инструкция steps guide' },
    compare: {
        id: 'compare',
        icon: '@tui.git-compare-arrows',
        slash: true,
        keywords: 'сравнение надо не надо compare',
    },
    columns: { id: 'columns', icon: '@tui.columns-3', slash: true, keywords: 'колонки columns' },
    table: { id: 'table', icon: '@tui.table', slash: true, keywords: 'таблица table' },
    codeBlock: { id: 'codeBlock', icon: '@tui.square-code', slash: true, keywords: 'код команда code block' },
    divider: { id: 'divider', icon: '@tui.minus', slash: true, keywords: 'разделитель линия divider hr' },
    image: { id: 'image', icon: '@tui.image', slash: true, keywords: 'картинка изображение скриншот image upload' },
    imageUrl: { id: 'imageUrl', icon: '@tui.image-plus', slash: true, keywords: 'картинка по ссылке image url' },
    gallery: { id: 'gallery', icon: '@tui.images', slash: true, keywords: 'галерея картинки gallery' },
    youtube: { id: 'youtube', icon: '@tui.youtube', slash: true, keywords: 'видео ютуб youtube video' },
    find: { id: 'find', icon: '@tui.search', hotkey: 'Ctrl+F' },
};

/**
 * Группы кнопок панели. `callouts` — выпадающее меню выносок.
 */
export const WIKI_TOOLBAR: readonly (readonly WikiCommandId[] | 'callouts')[] = [
    ['undo', 'redo'],
    ['h2', 'h3'],
    ['bold', 'italic', 'underline', 'strike', 'highlight', 'code', 'spoiler'],
    ['dash', 'nbsp'],
    ['link', 'wikiLink', 'ruleLink', 'kbd', 'footnote'],
    ['list', 'orderedList', 'checklist', 'quote'],
    'callouts',
    ['details', 'steps', 'compare', 'columns', 'table', 'codeBlock', 'divider'],
    ['image', 'gallery', 'youtube'],
];

/**
 * Выноски для выпадающего меню.
 */
export const WIKI_CALLOUTS: readonly WikiCommandId[] = ['tip', 'info', 'warn', 'danger'];

/**
 * Пункты меню «/» в порядке показа.
 */
export const WIKI_SLASH: readonly WikiCommand[] = Object.values(WIKI_COMMANDS).filter((command) => command.slash);
