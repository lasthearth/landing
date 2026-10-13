import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
    untracked,
    ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { WikiAuthorNameService } from '@entities/wiki';
import { WikiDraft, WikiHeading, WikiImage } from '@entities/wiki';
import { WIKI_SECTIONS } from '../../lib/wiki-sections.constant';

/**
 * Адрес лицензии, под которой публикуются материалы статьи.
 */
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/deed.ru';

/**
 * Статья вики в том виде, в каком её увидит читатель.
 *
 * Используется и как просмотр в редакторе (`preview`), и на странице статьи.
 * HTML приходит из `renderWikiMarkdown` — весь пользовательский текст там уже
 * экранирован, поэтому он вставляется без санитайзера (иначе пропали бы
 * SVG-иконки выносок и data-атрибуты для просмотра картинок).
 *
 * Сам компонент оживляет статью: увеличение картинок с листанием,
 * копирование блоков кода, загрузку ролика по нажатию и переходы по якорям.
 */
@Component({
    standalone: true,
    selector: 'app-wiki-article-view',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './wiki-article-view.component.html',
    styleUrls: [
        './wiki-article-view.component.head.less',
        './wiki-article-view.component.body.less',
        './wiki-article-view.component.lightbox.less',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // Стили статьи действуют на HTML из [innerHTML], поэтому без инкапсуляции (всё под .wiki-view).
    encapsulation: ViewEncapsulation.None,
    host: { '(document:keydown)': 'onKeydown($event)' },
})
export class WikiArticleViewComponent {
    private readonly sanitizer = inject(DomSanitizer);
    private readonly router = inject(Router);
    private readonly i18n = inject(I18nService);
    private readonly authorNames = inject(WikiAuthorNameService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    public readonly draft = input.required<WikiDraft>();
    public readonly html = input('');
    public readonly headings = input<readonly WikiHeading[]>([]);
    public readonly images = input<readonly WikiImage[]>([]);
    public readonly words = input(0);
    public readonly updatedAt = input<string | null>(null);
    /**
     * Кто правил последним.
     */
    public readonly authorName = input('');
    /**
     * Кто создал статью; не меняется при правках.
     */
    public readonly createdBy = input('');

    /**
     * Заголовок статьи по адресу — для карточек «См. также».
     */
    public readonly resolveTitle = input<(slug: string) => string | null>(() => null);

    /**
     * Просмотр в редакторе: ссылки на статьи не уводят со страницы.
     */
    public readonly preview = input(false);

    /**
     * Адрес лицензии — для строки в подвале статьи.
     */
    protected readonly licenseUrl = LICENSE_URL;

    /**
     * Двойной клик по блоку в просмотре — номер строки исходника.
     */
    public readonly lineClick = output<number>();

    protected readonly safeHtml = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

    protected readonly section = computed(
        () => WIKI_SECTIONS.find((item) => item.id === this.draft().sectionId) ?? null
    );

    /**
     * Фон обложки: адрес в кавычках, чтобы скобки в нём не ломали `url()`.
     */
    protected readonly coverImage = computed(() => {
        const cover = this.draft().cover;
        return cover ? `url(${JSON.stringify(cover.url)})` : null;
    });

    protected readonly minutes = computed(() => Math.max(1, Math.round(this.words() / 200)));

    /**
     * Оглавление: подписи абзацев (пятый уровень) в него не попадают.
     */
    protected readonly tocHeadings = computed(() => this.headings().filter((heading) => heading.level <= 4));

    /**
     * Подпись автора: игровое имя вместо идентификатора из токена.
     *
     * Сервер хранит subject, поэтому в подписи он появится только до тех пор,
     * пока сервис пользователей не ответит именем.
     */
    protected readonly createdLabel = computed(() => this.authorNames.name(this.createdBy()) ?? '');

    /**
     * Имя последнего редактора — только если правил не автор статьи.
     */
    protected readonly editorLabel = computed(() => {
        const editor = this.authorName();
        const author = this.createdBy();

        return editor && editor !== author ? (this.authorNames.name(editor) ?? '') : '';
    });

    constructor() {
        // Имена запрашиваем по факту показа, а на сервере подписей нет.
        effect(() => {
            const stored = [this.createdBy(), this.authorName()];

            untracked(() => void this.authorNames.resolve(stored));
        });
    }

    protected readonly related = computed(() =>
        this.draft().related.map((slug) => ({ slug, title: this.resolveTitle()(slug) }))
    );

    protected readonly updatedLabel = computed(() => {
        const value = this.updatedAt();

        if (!value) {
            return '';
        }

        return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(value));
    });

    /**
     * Открытая в просмотре картинка.
     */
    protected readonly lightbox = signal<number | null>(null);

    protected readonly tocOpen = signal(true);

    /**
     * Клики внутри статьи: картинки, код, видео, якоря и ссылки.
     *
     * @param event Событие клика.
     */
    protected onClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;

        const image = target.closest<HTMLImageElement>('img[data-wiki-img]');

        if (image) {
            this.lightbox.set(Number(image.dataset['wikiImg']));
            return;
        }

        const copy = target.closest<HTMLButtonElement>('.wiki-code__copy');

        if (copy) {
            const code = copy.parentElement?.querySelector('code')?.textContent ?? '';
            void navigator.clipboard?.writeText(code).then(() => {
                copy.classList.add('is-copied');
                setTimeout(() => copy.classList.remove('is-copied'), 1500);
            });
            return;
        }

        const video = target.closest<HTMLButtonElement>('.wiki-video[data-yt]');

        if (video) {
            const frame = document.createElement('iframe');
            frame.src = `https://www.youtube-nocookie.com/embed/${video.dataset['yt']}?autoplay=1`;
            frame.className = 'wiki-video wiki-video--playing';
            frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
            frame.allowFullscreen = true;
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.title = 'YouTube';
            video.replaceWith(frame);
            return;
        }

        const link = target.closest<HTMLAnchorElement>('a[href]');

        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || link.target === '_blank') {
            return;
        }

        const href = link.getAttribute('href') ?? '';

        if (href.startsWith('#')) {
            event.preventDefault();
            this.scrollToAnchor(href.slice(1));
            return;
        }

        if (href.startsWith('/')) {
            event.preventDefault();

            if (!this.preview()) {
                void this.router.navigateByUrl(href);
            }
        }
    }

    /**
     * Двойной клик в просмотре — к строке исходника.
     *
     * @param event Событие.
     */
    protected onDblClick(event: MouseEvent): void {
        if (!this.preview()) {
            return;
        }

        const block = (event.target as HTMLElement).closest<HTMLElement>('[data-line]');

        if (block) {
            this.lineClick.emit(Number(block.dataset['line']));
        }
    }

    /**
     * Прокручивает к разделу статьи.
     *
     * @param id Якорь.
     */
    public scrollToAnchor(id: string): void {
        const element = this.host.nativeElement.querySelector(`[id="${CSS.escape(id)}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    protected step(delta: number): void {
        const count = this.images().length;
        this.lightbox.update((index) => (index === null || !count ? null : (index + delta + count) % count));
    }

    protected onKeydown(event: KeyboardEvent): void {
        if (this.lightbox() === null) {
            return;
        }

        if (event.key === 'Escape') {
            this.lightbox.set(null);
        } else if (event.key === 'ArrowRight') {
            this.step(1);
        } else if (event.key === 'ArrowLeft') {
            this.step(-1);
        }
    }

    protected sectionLabel(id: string): string {
        return this.i18n.translate(`wiki.sections.${id}`);
    }
}
