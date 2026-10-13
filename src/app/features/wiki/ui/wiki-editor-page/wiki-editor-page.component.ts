import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    PLATFORM_ID,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { Role } from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { MediaService } from '@entities/media';
import { UserService } from '@entities/user';
import { compressImage } from '@shared/lib/compress-image.function';
import { sanitizeUrl } from '@shared/lib/news-markdown';
import { WikiStoreService } from '../../api/wiki-store.service';
import {
    WikiAuthorNameService,
    WikiCover,
    WikiDraft,
    WikiIssue,
    WikiRevision,
    WikiSectionId,
    WikiStatus,
} from '@entities/wiki';
import { renderWikiMarkdown, WikiRenderLabels } from '../../lib/render-wiki-markdown.function';
import { lintWikiArticle, WIKI_LIMITS } from '../../lib/lint-wiki-article.function';
import { isValidSlug, slugify } from '../../lib/slugify.function';
import { WIKI_SECTIONS } from '../../lib/wiki-sections.constant';
import { WIKI_TEMPLATES, WikiTemplate } from '../../lib/wiki-templates.constant';
import { DiffLine, lineDiff } from '../../lib/line-diff.function';
import { typograph } from '../../lib/typograph.function';
import { WikiCommandId } from '../../lib/wiki-commands.constant';
import { WikiMarkupInputComponent } from '../wiki-markup-input/wiki-markup-input.component';
import { WikiArticleViewComponent } from '../wiki-article-view/wiki-article-view.component';

/**
 * Вкладка боковой панели.
 */
type SideTab = 'props' | 'toc' | 'check' | 'images' | 'help';

/**
 * Режим рабочей области.
 */
type ViewMode = 'write' | 'split' | 'preview';

/**
 * Пустая статья.
 */
const EMPTY: WikiDraft = {
    title: '',
    slug: '',
    sectionId: null,
    lead: '',
    cover: null,
    tags: [],
    gameVersion: '',
    quickAnswer: null,
    related: [],
    body: '',
};

/**
 * Максимум тегов.
 */
const MAX_TAGS = 8;

/**
 * Строка шпаргалки: синтаксис, пояснение и действие для вставки.
 */
interface CheatRow {
    readonly code: string;
    readonly key: string;
    readonly command?: WikiCommandId;
}

/**
 * Шпаргалка по разметке.
 */
const CHEATSHEET: readonly CheatRow[] = [
    { code: '## Раздел', key: 'h2', command: 'h2' },
    { code: '### Подраздел', key: 'h3', command: 'h3' },
    { code: '**жирный** *курсив* __подчёркнутый__', key: 'format', command: 'bold' },
    { code: '~~зачёркнутый~~ ==выделение== ||спойлер||', key: 'format2', command: 'highlight' },
    { code: '`код`', key: 'code', command: 'code' },
    { code: '[текст](https://…)', key: 'link', command: 'link' },
    { code: '[[адрес-статьи|текст]]', key: 'wikiLink', command: 'wikiLink' },
    { code: '[[#раздел]]', key: 'anchorLink', command: 'anchorLink' },
    { code: '[[rule:5.2]]', key: 'ruleLink', command: 'ruleLink' },
    { code: '[[kbd:Ctrl+C]]', key: 'kbd', command: 'kbd' },
    { code: 'текст[^1] … [^1]: пояснение', key: 'footnote', command: 'footnote' },
    { code: '- пункт / 1. пункт', key: 'list', command: 'list' },
    { code: '- [ ] задача / - [x] готово', key: 'checklist', command: 'checklist' },
    { code: '> цитата', key: 'quote', command: 'quote' },
    { code: ':::tip | info | warn | danger Заголовок', key: 'callout', command: 'tip' },
    { code: ':::details Заголовок', key: 'details', command: 'details' },
    { code: ':::steps → 1. Шаг', key: 'steps', command: 'steps' },
    { code: ':::compare → +++', key: 'compare', command: 'compare' },
    { code: ':::columns → +++', key: 'columns', command: 'columns' },
    { code: '| A | B |\n|---|---|', key: 'table', command: 'table' },
    { code: '![подпись](url){right small}', key: 'image', command: 'imageUrl' },
    { code: ':::gallery', key: 'gallery', command: 'gallery' },
    { code: '@youtube(ссылка)', key: 'youtube', command: 'youtube' },
    { code: '```\nкод\n```', key: 'codeBlock', command: 'codeBlock' },
    { code: '---', key: 'divider', command: 'divider' },
];

/**
 * Сочетания клавиш для шпаргалки.
 */
const HOTKEYS: readonly [string, string][] = [
    ['Ctrl+S', 'save'],
    ['Ctrl+B / I / U', 'format'],
    ['Ctrl+K', 'link'],
    ['Ctrl+Shift+K', 'wikiLink'],
    ['Ctrl+E', 'code'],
    ['Ctrl+Alt+2 / 3', 'heading'],
    ['Ctrl+Shift+7 / 8 / 9', 'lists'],
    ['Ctrl+F / Ctrl+H', 'find'],
    ['Ctrl+D', 'duplicate'],
    ['Alt+↑ / ↓', 'move'],
    ['Tab / Shift+Tab', 'indent'],
    ['/', 'slash'],
    ['[[', 'autocomplete'],
    ['Esc, Tab', 'leave'],
];

/**
 * Редактор статьи вики.
 *
 * Полноэкранное рабочее место администратора: поле разметки с панелью,
 * подсказками и загрузкой картинок, живой просмотр с синхронной прокруткой,
 * свойства статьи, оглавление с перестановкой разделов, проверка перед
 * публикацией, картинки статьи, шпаргалка, история правок со сравнением,
 * заготовки, типограф, импорт и экспорт Markdown, автосохранение и защита
 * от потери несохранённого текста.
 */
@Component({
    standalone: true,
    selector: 'app-wiki-editor-page',
    imports: [TuiIcon, TranslatePipe, FormsModule, RouterLink, WikiMarkupInputComponent, WikiArticleViewComponent],
    templateUrl: './wiki-editor-page.component.html',
    styleUrls: [
        './wiki-editor-page.component.base.less',
        './wiki-editor-page.component.sidebar.fields.less',
        './wiki-editor-page.component.sidebar.toc.less',
        './wiki-editor-page.component.dialogs.less',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(window:beforeunload)': 'onBeforeUnload($event)',
        '(document:keydown)': 'onDocumentKeydown($event)',
        '(document:mousedown)': 'onDocumentDown($event)',
    },
})
export class WikiEditorPageComponent {
    private readonly store = inject(WikiStoreService);
    private readonly media = inject(MediaService);
    private readonly userService = inject(UserService);
    private readonly authorNames = inject(WikiAuthorNameService);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    private readonly inputRef = viewChild(WikiMarkupInputComponent);
    private readonly viewRef = viewChild(WikiArticleViewComponent);
    private readonly previewScrollRef = viewChild<ElementRef<HTMLElement>>('previewScroll');
    private readonly importRef = viewChild<ElementRef<HTMLInputElement>>('importInput');
    private readonly coverFileRef = viewChild<ElementRef<HTMLInputElement>>('coverFile');

    protected readonly sections = WIKI_SECTIONS;
    protected readonly templates = WIKI_TEMPLATES;
    protected readonly cheatsheet = CHEATSHEET;
    protected readonly hotkeys = HOTKEYS;
    protected readonly limits = WIKI_LIMITS;

    // ———————— Поля статьи ————————

    protected readonly title = signal('');
    protected readonly slug = signal('');
    /**
     * Адрес задан вручную и больше не следует за заголовком.
     */
    protected readonly slugLocked = signal(false);
    protected readonly sectionId = signal<WikiSectionId | null>(null);
    protected readonly lead = signal('');
    protected readonly cover = signal<WikiCover | null>(null);
    protected readonly tags = signal<readonly string[]>([]);
    protected readonly gameVersion = signal('');
    protected readonly quickOn = signal(false);
    protected readonly quickQuestion = signal('');
    protected readonly quickAnswer = signal('');
    protected readonly related = signal<readonly string[]>([]);
    protected readonly body = signal('');
    /**
     * Комментарий к правке для истории.
     */
    protected readonly note = signal('');

    // ———————— Состояние статьи ————————

    protected readonly articleId = signal<string | null>(null);
    protected readonly status = signal<WikiStatus>('draft');
    protected readonly updatedAt = signal<string | null>(null);
    /**
     * Статья ещё едет с сервера: редактор открывают по прямой ссылке, и до
     * ответа показывать пустую форму нельзя — читатель решит, что она потеряна.
     */
    protected readonly loadingArticle = signal(false);

    private readonly savedSnapshot = signal(JSON.stringify(EMPTY));
    protected readonly savedAt = signal<Date | null>(null);
    protected readonly autosavedAt = signal<Date | null>(null);
    protected readonly saveError = signal(false);

    /**
     * Найденное автосохранение, которое можно восстановить.
     */
    protected readonly restore = signal<{ draft: WikiDraft; savedAt: string } | null>(null);

    // ———————— Интерфейс ————————

    protected readonly tab = signal<SideTab>('props');
    protected readonly mode = signal<ViewMode>('split');
    protected readonly mobilePreview = signal(false);
    protected readonly sideOpen = signal(true);
    protected readonly syncScroll = signal(true);
    protected readonly moreOpen = signal(false);
    protected readonly templatesOpen = signal(false);
    protected readonly historyOpen = signal(false);
    protected readonly historyPick = signal<WikiRevision | null>(null);
    protected readonly tagInput = signal('');
    protected readonly relatedQuery = signal('');
    protected readonly coverUrlInput = signal('');
    protected readonly coverUploading = signal(false);
    protected readonly copied = signal(false);
    protected readonly publishShake = signal(false);

    /**
     * Своё окно подтверждения (окна Taiga остаются под полноэкранным редактором).
     */
    protected readonly confirmState = signal<{
        title: string;
        text: string;
        action: string;
        danger: boolean;
        resolve: (ok: boolean) => void;
    } | null>(null);

    /**
     * Текст для разбора — с задержкой, чтобы набор не тормозил на длинных статьях.
     */
    private readonly bodyForRender = signal('');

    // ———————— Производные ————————

    protected readonly draft = computed<WikiDraft>(() => ({
        title: this.title(),
        slug: this.slug(),
        sectionId: this.sectionId(),
        lead: this.lead(),
        cover: this.cover(),
        tags: this.tags(),
        gameVersion: this.gameVersion(),
        quickAnswer: this.quickOn() ? { question: this.quickQuestion(), answer: this.quickAnswer() } : null,
        related: this.related(),
        body: this.body(),
    }));

    /**
     * Статья для просмотра: заголовок и поля — сразу, текст — с задержкой разбора.
     */
    protected readonly previewDraft = computed<WikiDraft>(() => ({ ...this.draft(), body: this.bodyForRender() }));

    protected readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.savedSnapshot());

    private readonly renderLabels = computed<WikiRenderLabels>(() => {
        this.i18n.language();
        const t = (key: string): string => this.i18n.translate(`wiki.render.${key}`);
        return {
            details: t('details'),
            compareBad: t('compareBad'),
            compareGood: t('compareGood'),
            footnotes: t('footnotes'),
            copy: t('copy'),
            video: t('video'),
            missingArticle: t('missingArticle'),
            player: t('player'),
        };
    });

    /**
     * Заголовок статьи по адресу (с учётом этой статьи).
     */
    protected readonly resolveTitle = computed(() => {
        const ownSlug = this.slug();
        const ownTitle = this.title();
        const ownId = this.articleId();
        const map = new Map(
            this.store
                .articles()
                .filter((article) => article.id !== ownId)
                .map((article) => [article.slug, article.title])
        );

        return (slug: string): string | null =>
            slug === ownSlug && ownSlug ? ownTitle || slug : (map.get(slug) ?? null);
    });

    protected readonly render = computed(() =>
        renderWikiMarkdown(this.bodyForRender(), {
            resolveArticle: this.resolveTitle(),
            // Ссылка [[player:id]] показывает текущий ник: id не меняется при смене ника.
            resolvePlayer: (id) => this.authorNames.name(id),
            labels: this.renderLabels(),
        })
    );

    protected readonly issues = computed<WikiIssue[]>(() => {
        const ownId = this.articleId();
        const articles = this.store.articles();
        const draft = { ...this.draft(), body: this.bodyForRender() };

        return lintWikiArticle(draft, this.render(), {
            slugTaken: (slug) => articles.some((article) => article.slug === slug && article.id !== ownId),
            exists: (slug) => articles.some((article) => article.slug === slug && article.id !== ownId),
        });
    });

    protected readonly errors = computed(() => this.issues().filter((issue) => issue.level === 'error'));
    protected readonly warnings = computed(() => this.issues().filter((issue) => issue.level === 'warning'));
    protected readonly tips = computed(() => this.issues().filter((issue) => issue.level === 'tip'));

    /**
     * Отметки на полях редактора: самое серьёзное замечание строки.
     */
    protected readonly marks = computed(() => {
        const marks = new Map<number, 'error' | 'warning' | 'tip'>();
        const rank = { error: 0, warning: 1, tip: 2 };

        for (const issue of this.issues()) {
            if (issue.line === undefined) {
                continue;
            }
            const current = marks.get(issue.line);
            if (!current || rank[issue.level] < rank[current]) {
                marks.set(issue.line, issue.level);
            }
        }

        return marks;
    });

    /**
     * Замечания к полям формы (подсветка полей).
     */
    protected readonly fieldIssue = computed(() => {
        const map = new Map<string, WikiIssue>();

        for (const issue of this.issues()) {
            if (issue.field && issue.level !== 'tip' && !map.has(issue.field)) {
                map.set(issue.field, issue);
            }
        }

        return map;
    });

    /**
     * Статьи для подсказок ссылок: все, кроме этой.
     */
    protected readonly linkTargets = computed(() =>
        this.store
            .articles()
            .filter((article) => article.id !== this.articleId())
            .map((article) => ({ slug: article.slug, title: article.title }))
    );

    protected readonly relatedOptions = computed(() => {
        const query = this.relatedQuery().toLowerCase().trim();
        const taken = new Set(this.related());

        return this.linkTargets()
            .filter((article) => !taken.has(article.slug) && article.slug !== this.slug())
            .filter((article) => !query || article.title.toLowerCase().includes(query) || article.slug.includes(query))
            .slice(0, 6);
    });

    /**
     * Статьи, на которые текст ссылается, но которых нет в «См. также».
     */
    protected readonly relatedSuggestions = computed(() => {
        const taken = new Set(this.related());
        const known = new Set(this.linkTargets().map((article) => article.slug));
        return [...new Set(this.render().articleLinks.map((link) => link.slug))].filter(
            (slug) => known.has(slug) && !taken.has(slug) && slug !== this.slug()
        );
    });

    /**
     * Статьи, которые ссылаются на эту.
     */
    protected readonly backlinks = computed(() => {
        const slug = this.slug();

        if (!slug) {
            return [];
        }

        return this.store
            .articles()
            .filter((article) => article.id !== this.articleId())
            .filter(
                (article) => article.related.includes(slug) || new RegExp(`\\[\\[${slug}(?:[#|\\]])`).test(article.body)
            );
    });

    /**
     * Теги других статей — подсказки для поля тегов.
     */
    protected readonly knownTags = computed(() => {
        const own = new Set(this.tags());
        const all = new Set(this.store.articles().flatMap((article) => article.tags));
        return [...all].filter((tag) => !own.has(tag)).sort();
    });

    /**
     * Разделы статьи с размером (слов) — для вкладки оглавления.
     */
    protected readonly outline = computed(() => {
        const lines = this.bodyForRender().split('\n');
        const headings = this.render().headings;

        // Пятый уровень — подпись абзаца: в оглавлении ей нечего делать.
        return headings
            .map((heading, index) => {
                const next = headings.slice(index + 1).find((item) => item.level <= heading.level);
                const end = next ? next.line : lines.length;
                const words =
                    lines
                        .slice(heading.line + 1, end)
                        .join(' ')
                        .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
                const h2Index =
                    heading.level === 2
                        ? headings.filter((item, at) => at <= index && item.level === 2).length - 1
                        : -1;

                return { ...heading, words, h2Index };
            })
            .filter((heading) => heading.level <= 4);
    });

    protected readonly h2Count = computed(() => this.render().headings.filter((heading) => heading.level === 2).length);

    protected readonly history = computed(() => {
        const id = this.articleId();
        this.savedAt();
        return id ? this.store.history(id) : [];
    });

    protected readonly historyDiff = computed<DiffLine[]>(() => {
        const pick = this.historyPick();
        return pick ? lineDiff(pick.article.body, this.body()) : [];
    });

    protected readonly historyDiffStats = computed(() => {
        const diff = this.historyDiff();
        return {
            added: diff.filter((line) => line.kind === 'add').length,
            removed: diff.filter((line) => line.kind === 'del').length,
        };
    });

    protected readonly leadLength = computed(() => this.lead().trim().length);

    /**
     * Обрезка обложки для превью в свойствах.
     */
    protected readonly coverImage = computed(() => {
        const cover = this.cover();
        return cover ? `url(${JSON.stringify(cover.url)})` : null;
    });

    /**
     * Загрузка картинки: сжатие в WebP и загрузка в медиасервис.
     */
    protected readonly uploadImage = async (file: File): Promise<string> => {
        const compressed = await compressImage(file, { maxWidth: 2000, maxHeight: 2000, quality: 0.9 });
        return this.media.uploadFile(compressed, 'UPLOAD_PURPOSE_WIKI');
    };

    private renderTimer: ReturnType<typeof setTimeout> | null = null;
    /**
     * Игрок пришёл предложить правку, а не править напрямую: он видит кнопку
     * отправки на проверку, а не публикации.
     */
    protected readonly suggestMode = this.route.snapshot.queryParamMap.get('suggest') === '1';

    /**
     * Редактор правит напрямую; игрок предлагает.
     */
    protected readonly isEditor = this.userService.roles.includes(Role.admin);

    private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    private scrollFrame = 0;
    private pendingTopLine = 0;

    public constructor() {
        this.load();

        // Список статей нужен редактору целиком: из него берутся подсказки
        // «См. также», обратные ссылки, теги и разбор ссылок [[адрес]]. Без этой
        // загрузки они пусты, потому что стор знает только открытую статью.
        afterNextRender(() => void this.store.load());

        // Разбор текста — через 150 мс после последней правки.
        effect(() => {
            const text = this.body();

            untracked(() => {
                if (this.renderTimer) {
                    clearTimeout(this.renderTimer);
                }

                if (!this.bodyForRender() || !text) {
                    this.bodyForRender.set(text);
                    return;
                }

                this.renderTimer = setTimeout(() => this.bodyForRender.set(text), 150);
            });
        });

        // Ники для ссылок [[player:id]] догружаем по мере появления в тексте.
        effect(() => {
            const ids = this.render().playerIds;

            untracked(() => void this.authorNames.resolve(ids));
        });

        // Адрес следует за заголовком, пока его не правили руками.
        effect(() => {
            const title = this.title();

            if (!untracked(this.slugLocked)) {
                this.slug.set(slugify(title));
            }
        });

        // Автосохранение в браузере через секунду после правки.
        effect(() => {
            const draft = this.draft();
            const dirty = this.dirty();

            untracked(() => {
                if (this.autosaveTimer) {
                    clearTimeout(this.autosaveTimer);
                }

                if (!dirty || this.restore()) {
                    return;
                }

                this.autosaveTimer = setTimeout(() => {
                    this.store.writeAutosave(this.autosaveKey(), draft);
                    this.autosavedAt.set(new Date());
                }, 1000);
            });
        });

        // Узкий экран: рядом не помещается, остаётся одна колонка.
        afterNextRender(() => {
            if (window.innerWidth < 1100) {
                this.mode.set('write');
                this.sideOpen.set(window.innerWidth >= 768);
            }

            // Полноэкранный редактор: страница под ним не прокручивается.
            const overflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            this.destroyRef.onDestroy(() => (document.body.style.overflow = overflow));
        });

        this.destroyRef.onDestroy(() => {
            if (this.renderTimer) {
                clearTimeout(this.renderTimer);
            }
            if (this.autosaveTimer) {
                clearTimeout(this.autosaveTimer);
            }
            // Кадры анимации существуют только в браузере: на сервере их нет,
            // а этот обработчик вызывается и при завершении SSR-рендера.
            if (this.isBrowser) {
                cancelAnimationFrame(this.scrollFrame);
            }
        });
    }

    // ———————————————— Загрузка и сохранение ————————————————

    /**
     * Открывает статью из адреса `/wiki/edit/:id` (`new` — новая).
     */
    private load(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const article = id && id !== 'new' ? this.store.get(id) : null;

        if (article) {
            this.articleId.set(article.id);
            this.status.set(article.status);
            this.updatedAt.set(article.updatedAt);
            this.applyDraft(article);
            this.slugLocked.set(true);
            this.savedSnapshot.set(JSON.stringify(this.draft()));
            void this.store.loadHistory(article.id);
        } else {
            this.templatesOpen.set(true);
        }

        const autosave = this.store.autosave(this.autosaveKey());

        if (autosave && JSON.stringify(autosave.draft) !== this.savedSnapshot()) {
            this.restore.set(autosave);
            this.templatesOpen.set(false);
        }

        // Статьи может не быть в снимке: редактор открывают по прямой ссылке,
        // а список к этому моменту ещё не загружен. Тогда запрашиваем её саму.
        if (id && id !== 'new' && !article) {
            void this.loadArticle(id);
        }
    }

    /**
     * Догружает статью по идентификатору и заполняет по ней редактор.
     *
     * @param id Идентификатор статьи.
     */
    private async loadArticle(id: string): Promise<void> {
        this.loadingArticle.set(true);

        const article = await this.store.loadById(id);

        if (!article) {
            this.loadingArticle.set(false);
            this.saveError.set(true);

            return;
        }

        this.articleId.set(article.id);
        this.status.set(article.status);
        this.updatedAt.set(article.updatedAt);
        this.applyDraft(article);
        this.slugLocked.set(true);
        this.savedSnapshot.set(JSON.stringify(this.draft()));
        this.templatesOpen.set(false);
        this.loadingArticle.set(false);
        await this.store.loadHistory(article.id);
    }

    /**
     * Заполняет поля из статьи или черновика.
     */
    private applyDraft(draft: WikiDraft): void {
        this.title.set(draft.title);
        this.slug.set(draft.slug);
        this.sectionId.set(draft.sectionId);
        this.lead.set(draft.lead);
        this.cover.set(draft.cover);
        this.tags.set([...draft.tags]);
        this.gameVersion.set(draft.gameVersion);
        this.quickOn.set(!!draft.quickAnswer);
        this.quickQuestion.set(draft.quickAnswer?.question ?? '');
        this.quickAnswer.set(draft.quickAnswer?.answer ?? '');
        this.related.set([...draft.related]);
        this.body.set(draft.body);
        this.bodyForRender.set(draft.body);
    }

    private autosaveKey(): string {
        return this.articleId() ?? 'new';
    }

    protected restoreAutosave(): void {
        const restore = this.restore();

        if (restore) {
            this.applyDraft(restore.draft);
            this.slugLocked.set(true);
        }

        this.restore.set(null);
    }

    protected dropAutosave(): void {
        this.store.clearAutosave(this.autosaveKey());
        this.restore.set(null);
    }

    /**
     * Сохраняет статью.
     *
     * @param status Статус после сохранения (по умолчанию — текущий).
     */
    protected async save(status: WikiStatus = this.status()): Promise<void> {
        if (status === 'published' && this.errors().length) {
            this.tab.set('check');
            this.sideOpen.set(true);
            this.publishShake.set(true);
            setTimeout(() => this.publishShake.set(false), 500);
            return;
        }

        const wasNew = !this.articleId();
        const oldKey = this.autosaveKey();

        try {
            const article = await this.store.save(this.articleId(), this.draft(), {
                status,
                authorName: this.userService.userName || 'admin',
                note: this.note().trim(),
            });

            this.articleId.set(article.id);
            this.status.set(article.status);
            this.updatedAt.set(article.updatedAt);
            this.savedSnapshot.set(JSON.stringify(this.draft()));
            this.savedAt.set(new Date());
            this.note.set('');
            // Поле могло не успеть получить последнее значение до очистки — чистим и его.
            const noteInput = document.getElementById('wiki-note') as HTMLInputElement | null;
            if (noteInput) {
                noteInput.value = '';
            }
            this.saveError.set(false);
            this.store.clearAutosave(oldKey);
            this.store.clearAutosave(article.id);
            await this.store.loadHistory(article.id);

            if (wasNew) {
                this.location.replaceState(`/wiki/edit/${article.id}`);
            }
        } catch {
            this.saveError.set(true);
        }
    }

    /**
     * Отправляет статью или правку на проверку игроком.
     *
     * Ничего не публикуется: предложение уходит в очередь, а статью применит
     * редактор. Публикация и удаление для игрока остаются недоступны.
     */
    protected submitForReview(): void {
        if (this.errors().length) {
            this.tab.set('check');
            this.sideOpen.set(true);
            this.publishShake.set(true);
            setTimeout(() => this.publishShake.set(false), 500);

            return;
        }

        this.store.submitSuggestion(this.draft(), this.articleId() ?? '', this.note().trim()).subscribe({
            next: () => {
                this.saveError.set(false);
                this.suggestSent.set(true);
                this.store.clearAutosave(this.autosaveKey());
            },
            error: () => this.saveError.set(true),
        });
    }

    /**
     * Отправлено ли предложение — показывает подтверждение автору.
     */
    protected readonly suggestSent = signal(false);

    /**
     * Удаление не удалось — показываем, а не молчим.
     */
    protected readonly deleteError = signal(false);

    /**
     * Уход из редактора.
     *
     * Кнопка «назад» намеренно ведёт навигацию сама, а не через страж маршрута:
     * страж спрашивает подтверждение и только потом пускает, из-за чего первый
     * клик выглядел как «ничего не произошло». Здесь один клик даёт один исход —
     * либо уходим сразу, либо получаем окно, после которого точно уходим.
     */
    protected leave(): void {
        if (!this.dirty()) {
            void this.router.navigateByUrl('/profile/admin');

            return;
        }

        void this.ask('leave', true).then((confirmed) => {
            if (confirmed) {
                this.savedSnapshot.set(JSON.stringify(this.draft()));
                void this.router.navigateByUrl('/profile/admin');
            }
        });
    }

    protected unpublish(): void {
        this.moreOpen.set(false);
        this.save('draft');
    }

    // ———————————————— Поля ————————————————

    protected setTitle(value: string): void {
        this.title.set(value);
    }

    protected setSlug(value: string): void {
        this.slugLocked.set(true);
        this.slug.set(
            value
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/-{2,}/g, '-')
        );
    }

    protected toggleSlugLock(): void {
        const locked = !this.slugLocked();
        this.slugLocked.set(locked);

        if (!locked) {
            this.slug.set(slugify(this.title()));
        }
    }

    protected slugValid(): boolean {
        return isValidSlug(this.slug());
    }

    protected copyLink(): void {
        void navigator.clipboard?.writeText(`https://lasthearth.ru/wiki/${this.slug()}`).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }

    protected addTag(raw: string = this.tagInput()): void {
        const parts = raw
            .split(',')
            .map((tag) => tag.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'))
            .filter(Boolean);

        if (parts.length) {
            this.tags.update((tags) => [...new Set([...tags, ...parts])].slice(0, MAX_TAGS));
        }

        this.tagInput.set('');
    }

    protected onTagKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const input = event.target as HTMLInputElement;
            this.addTag(input.value);
            input.value = '';
        } else if (event.key === 'Backspace' && !this.tagInput() && this.tags().length) {
            this.tags.update((tags) => tags.slice(0, -1));
        }
    }

    protected removeTag(tag: string): void {
        this.tags.update((tags) => tags.filter((item) => item !== tag));
    }

    protected addRelated(slug: string): void {
        this.related.update((list) => (list.includes(slug) ? list : [...list, slug]));
        this.relatedQuery.set('');
    }

    protected removeRelated(slug: string): void {
        this.related.update((list) => list.filter((item) => item !== slug));
    }

    protected moveRelated(index: number, delta: number): void {
        this.related.update((list) => {
            const next = [...list];
            const target = index + delta;

            if (target < 0 || target >= next.length) {
                return list;
            }

            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }

    protected relatedTitle(slug: string): string | null {
        return this.resolveTitle()(slug);
    }

    protected setCoverFocus(value: number): void {
        this.cover.update((cover) => (cover ? { ...cover, focus: Math.round(value) } : cover));
    }

    protected setCoverUrl(input: HTMLInputElement): void {
        const url = sanitizeUrl(input.value);

        if (url) {
            this.cover.set({ url, focus: this.cover()?.focus ?? 40 });
            this.coverUrlInput.set('');
            input.value = '';
        }
    }

    protected useAsCover(url: string): void {
        this.cover.set({ url, focus: 40 });
        this.tab.set('props');
    }

    protected pickCoverFile(): void {
        this.coverFileRef()?.nativeElement.click();
    }

    protected async onCoverFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';

        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        this.coverUploading.set(true);

        try {
            this.cover.set({ url: await this.uploadImage(file), focus: this.cover()?.focus ?? 40 });
        } catch {
            this.saveError.set(true);
        } finally {
            this.coverUploading.set(false);
        }
    }

    protected toggleQuick(): void {
        this.quickOn.update((on) => !on);

        // Вопрос по умолчанию — заголовок, ответ — вступление: обычно этого почти хватает.
        if (this.quickOn() && !this.quickQuestion() && !this.quickAnswer()) {
            this.quickQuestion.set(this.title());
            this.quickAnswer.set(this.lead().slice(0, WIKI_LIMITS.quickAnswer));
        }
    }

    // ———————————————— Текст ————————————————

    protected goToLine(line: number): void {
        if (this.mode() === 'preview') {
            this.mode.set(window.innerWidth < 1100 ? 'write' : 'split');
            setTimeout(() => this.inputRef()?.goToLine(line, true), 50);
            return;
        }

        this.inputRef()?.goToLine(line, true);
    }

    /**
     * Переход к замечанию: строка текста или поле формы.
     */
    protected openIssue(issue: WikiIssue): void {
        if (issue.line !== undefined) {
            this.goToLine(issue.line);
            return;
        }

        if (issue.field === 'body') {
            this.inputRef()?.focus();
            return;
        }

        if (issue.field === 'title') {
            document.getElementById('wiki-title')?.focus();
            return;
        }

        if (issue.field) {
            this.tab.set('props');
            this.sideOpen.set(true);
            setTimeout(() => {
                const element = document.getElementById(`wf-${issue.field}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true });
                element?.classList.add('we-field--flash');
                setTimeout(() => element?.classList.remove('we-field--flash'), 1200);
            });
        }
    }

    protected issueText(issue: WikiIssue): string {
        return this.i18n.translate(`wiki.lint.${issue.code}`, issue.params);
    }

    protected runCommand(command: WikiCommandId | undefined): void {
        if (!command) {
            return;
        }

        if (this.mode() === 'preview') {
            this.mode.set('split');
        }

        setTimeout(() => this.inputRef()?.run(command));
    }

    /**
     * Меняет раздел `##` местами с соседним (вместе с подразделами).
     *
     * @param index Номер раздела `##` по порядку.
     * @param delta -1 — выше, 1 — ниже.
     */
    protected moveSection(index: number, delta: -1 | 1): void {
        const lines = this.body().split('\n');
        const starts = this.render()
            .headings.filter((heading) => heading.level === 2)
            .map((heading) => heading.line);
        const target = index + delta;

        if (target < 0 || target >= starts.length) {
            return;
        }

        // Пояснения сносок в конце статьи остаются на месте.
        let end = lines.length;
        while (end > 0 && (/^\[\^[\w-]+\]:/.test(lines[end - 1]) || !lines[end - 1].trim())) {
            end--;
        }

        const ranges = starts.map((start, at) => [
            start,
            at + 1 < starts.length ? starts[at + 1] : Math.max(end, start + 1),
        ]);
        const [first, second] = delta === -1 ? [target, index] : [index, target];
        const a = lines.slice(ranges[first][0], ranges[first][1]);
        const b = lines.slice(ranges[second][0], ranges[second][1]);
        const trim = (block: string[]): string[] => {
            const copy = [...block];
            while (copy.length && !copy[copy.length - 1].trim()) {
                copy.pop();
            }
            return copy;
        };

        const result = [
            ...lines.slice(0, ranges[first][0]),
            ...trim(b),
            '',
            ...trim(a),
            ...(ranges[second][1] < lines.length ? [''] : []),
            ...lines.slice(ranges[second][1]),
        ];

        this.inputRef()?.setText(result.join('\n').replace(/\n{3,}/g, '\n\n'));
    }

    protected applyTypograph(): void {
        this.moreOpen.set(false);
        this.inputRef()?.setText(typograph(this.body()));
        this.lead.set(typograph(this.lead()));
    }

    protected async applyTemplate(template: WikiTemplate): Promise<void> {
        if (this.body().trim() && !(await this.ask('templateReplace', false))) {
            return;
        }

        this.templatesOpen.set(false);

        if (!this.lead().trim()) {
            this.lead.set(template.lead);
        }

        const input = this.inputRef();

        if (input) {
            input.setText(template.body);
        } else {
            this.body.set(template.body);
        }
    }

    // ———————————————— Просмотр ————————————————

    protected setMode(mode: ViewMode): void {
        this.mode.set(mode);
    }

    /**
     * Прокрутка редактора → прокрутка просмотра к тому же месту (не чаще кадра).
     */
    protected onTopLine(line: number): void {
        if (!this.syncScroll() || this.mode() !== 'split') {
            return;
        }

        this.pendingTopLine = line;

        if (!this.isBrowser) {
            return;
        }

        cancelAnimationFrame(this.scrollFrame);
        this.scrollFrame = requestAnimationFrame(() => this.scrollPreviewTo(this.pendingTopLine));
    }

    private scrollPreviewTo(line: number): void {
        const container = this.previewScrollRef()?.nativeElement;
        const doc = container?.querySelector('.wiki-doc');

        if (!container || !doc) {
            return;
        }

        if (line === Number.POSITIVE_INFINITY) {
            container.scrollTop = container.scrollHeight;
            return;
        }

        const base = container.getBoundingClientRect().top - container.scrollTop;
        const blocks = [...doc.children]
            .filter(
                (element): element is HTMLElement =>
                    element instanceof HTMLElement && element.dataset['line'] !== undefined
            )
            .map((element) => ({
                line: Number(element.dataset['line']),
                top: element.getBoundingClientRect().top - base,
            }));

        if (!blocks.length) {
            return;
        }

        let target: number;

        if (line < blocks[0].line) {
            target = blocks[0].line ? (blocks[0].top * line) / blocks[0].line : 0;
        } else {
            let index = blocks.length - 1;
            while (index > 0 && blocks[index].line > line) {
                index--;
            }
            const a = blocks[index];
            const b = blocks[index + 1];
            target = b
                ? a.top + ((b.top - a.top) * (line - a.line)) / Math.max(1, b.line - a.line)
                : a.top + (line - a.line) * 26;
        }

        container.scrollTop = Math.max(0, target - 24);
    }

    /**
     * Блок просмотра, где сейчас курсор, подсвечивается.
     */
    protected onCaretLine(line: number): void {
        const doc = this.previewScrollRef()?.nativeElement.querySelector('.wiki-doc');

        if (!doc) {
            return;
        }

        let active: Element | null = null;

        for (const element of doc.children) {
            const value = (element as HTMLElement).dataset?.['line'];

            if (value !== undefined && Number(value) <= line) {
                active = element;
            }
        }

        doc.querySelector('.wiki-active-block')?.classList.remove('wiki-active-block');
        active?.classList.add('wiki-active-block');
    }

    protected scrollPreviewToAnchor(id: string): void {
        this.viewRef()?.scrollToAnchor(id);
    }

    protected toggleFullscreen(): void {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void document.documentElement.requestFullscreen?.();
        }
    }

    // ———————————————— История ————————————————

    protected openHistory(): void {
        this.historyOpen.set(true);
        this.historyPick.set(this.history()[0] ?? null);
    }

    protected async restoreRevision(revision: WikiRevision): Promise<void> {
        if (!(await this.ask('restoreRevision', false))) {
            return;
        }

        const { article } = revision;
        this.title.set(article.title);
        this.slug.set(article.slug);
        this.sectionId.set(article.sectionId);
        this.lead.set(article.lead);
        this.cover.set(article.cover);
        this.tags.set([...article.tags]);
        this.gameVersion.set(article.gameVersion);
        this.quickOn.set(!!article.quickAnswer);
        this.quickQuestion.set(article.quickAnswer?.question ?? '');
        this.quickAnswer.set(article.quickAnswer?.answer ?? '');
        this.related.set([...article.related]);
        this.inputRef()?.setText(article.body);
        this.note.set(
            this.i18n.translate('wiki.history.restoredNote', { date: this.formatTime(revision.savedAt, true) })
        );
        this.historyOpen.set(false);
    }

    protected revisionWords(revision: WikiRevision): number {
        return revision.article.body.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
    }

    // ———————————————— Ещё ————————————————

    protected exportMarkdown(): void {
        this.moreOpen.set(false);
        const draft = this.draft();
        const meta = [
            '---',
            `title: ${draft.title}`,
            `slug: ${draft.slug}`,
            `section: ${draft.sectionId ?? ''}`,
            `lead: ${draft.lead.replace(/\n/g, ' ')}`,
            `tags: ${draft.tags.join(', ')}`,
            `version: ${draft.gameVersion}`,
            `related: ${draft.related.join(', ')}`,
            `cover: ${draft.cover ? `${draft.cover.url} ${draft.cover.focus}` : ''}`,
            `question: ${draft.quickAnswer?.question ?? ''}`,
            `answer: ${draft.quickAnswer?.answer ?? ''}`,
            '---',
            '',
        ].join('\n');
        const blob = new Blob([meta + draft.body], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${draft.slug || 'wiki-article'}.md`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    protected importMarkdown(): void {
        this.moreOpen.set(false);
        this.importRef()?.nativeElement.click();
    }

    protected async onImportFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';

        if (!file) {
            return;
        }

        if (this.body().trim() && !(await this.ask('importReplace', false))) {
            return;
        }

        const text = (await file.text()).replace(/\r\n?/g, '\n');
        const front = /^---\n([\s\S]*?)\n---\n?/.exec(text);
        const body = front ? text.slice(front[0].length).replace(/^\n/, '') : text;

        if (front) {
            const meta = new Map(
                front[1]
                    .split('\n')
                    .map((line) => /^(\w+):\s?(.*)$/.exec(line))
                    .filter((match): match is RegExpExecArray => !!match)
                    .map((match) => [match[1], match[2].trim()])
            );
            const list = (key: string): string[] =>
                (meta.get(key) ?? '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
            const section = meta.get('section') as WikiSectionId | undefined;
            const [coverUrl, coverFocus] = (meta.get('cover') ?? '').split(' ');
            const safeCover = coverUrl ? sanitizeUrl(coverUrl) : null;

            this.title.set(meta.get('title') ?? this.title());
            this.slugLocked.set(true);
            this.slug.set(meta.get('slug') || slugify(this.title()));
            this.sectionId.set(WIKI_SECTIONS.some((item) => item.id === section) ? section! : this.sectionId());
            this.lead.set(meta.get('lead') ?? '');
            this.tags.set(list('tags').slice(0, MAX_TAGS));
            this.gameVersion.set(meta.get('version') ?? '');
            this.related.set(list('related'));
            this.cover.set(safeCover ? { url: safeCover, focus: Number(coverFocus) || 40 } : null);
            this.quickOn.set(!!(meta.get('question') || meta.get('answer')));
            this.quickQuestion.set(meta.get('question') ?? '');
            this.quickAnswer.set(meta.get('answer') ?? '');
        } else if (!this.title()) {
            const heading = /^#\s+(.+)$/m.exec(body);
            if (heading) {
                this.title.set(heading[1].trim());
            }
        }

        this.templatesOpen.set(false);
        this.inputRef()?.setText(body);
    }

    protected duplicate(): void {
        this.moreOpen.set(false);
        this.articleId.set(null);
        this.status.set('draft');
        this.updatedAt.set(null);
        this.title.update((title) => `${title} (${this.i18n.translate('wiki.editor.copySuffix')})`);
        this.slugLocked.set(true);
        this.slug.update((slug) => `${slug}-copy`);
        this.savedSnapshot.set(JSON.stringify(EMPTY));
        this.location.replaceState('/wiki/edit/new');
    }

    protected async remove(): Promise<void> {
        this.moreOpen.set(false);
        this.deleteError.set(false);
        const id = this.articleId();

        if (!(await this.ask('delete', true))) {
            return;
        }

        try {
            // Ждём ответ сервера: уход до него означал бы, что запрос могут
            // прервать вместе с компонентом, и статья осталась бы на месте.
            if (id) {
                await this.store.remove(id);
            }
        } catch {
            this.deleteError.set(true);

            return;
        }

        this.store.clearAutosave('new');
        this.savedSnapshot.set(JSON.stringify(this.draft()));
        void this.router.navigateByUrl('/profile/admin');
    }

    // ———————————————— Подтверждения и уход со страницы ————————————————

    /**
     * Своё окно подтверждения.
     *
     * @param key Ключ текстов `wiki.confirm.<key>`.
     * @param danger Красная кнопка.
     */
    protected ask(key: string, danger: boolean): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmState.set({
                title: this.i18n.translate(`wiki.confirm.${key}.title`),
                text: this.i18n.translate(`wiki.confirm.${key}.text`),
                action: this.i18n.translate(`wiki.confirm.${key}.action`),
                danger,
                resolve,
            });
        });
    }

    protected answer(ok: boolean): void {
        const state = this.confirmState();
        this.confirmState.set(null);
        state?.resolve(ok);
    }

    /**
     * Для стража ухода со страницы.
     */
    public canLeave(): Promise<boolean> | boolean {
        return this.dirty() ? this.ask('leave', true) : true;
    }

    protected onBeforeUnload(event: BeforeUnloadEvent): void {
        if (this.dirty()) {
            event.preventDefault();
        }
    }

    protected onDocumentKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            if (this.confirmState()) {
                this.answer(false);
            } else if (this.historyOpen()) {
                this.historyOpen.set(false);
            } else if (this.templatesOpen()) {
                this.templatesOpen.set(false);
            } else if (this.moreOpen()) {
                this.moreOpen.set(false);
            }
            return;
        }

        // Ctrl+S работает и вне поля текста (в поле его уже обработал редактор).
        if (
            !event.defaultPrevented &&
            (event.ctrlKey || event.metaKey) &&
            event.code === 'KeyS' &&
            !event.shiftKey &&
            !event.altKey
        ) {
            event.preventDefault();
            this.save();
        }
    }

    protected onDocumentDown(event: MouseEvent): void {
        if (this.moreOpen() && !(event.target as HTMLElement | null)?.closest('.we__more')) {
            this.moreOpen.set(false);
        }
    }

    // ———————————————— Подписи ————————————————

    protected formatTime(value: Date | string, withDate = false): string {
        const date = typeof value === 'string' ? new Date(value) : value;
        return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
            ...(withDate ? { day: 'numeric', month: 'short' } : {}),
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    protected sectionLabel(id: string): string {
        return this.i18n.translate(`wiki.sections.${id}`);
    }

    /**
     * Нужен в шаблоне для `isBrowser`-зависимых блоков.
     */
    protected get browser(): boolean {
        return this.isBrowser;
    }
}
