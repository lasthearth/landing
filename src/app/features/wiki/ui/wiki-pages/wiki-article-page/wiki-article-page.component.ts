import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    PLATFORM_ID,
    signal,
    untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { Role, UserService } from '@entities/user';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { WikiStoreService } from '../../../api/wiki-store.service';
import { renderWikiMarkdown } from '../../../lib/render-wiki-markdown.function';
import { WIKI_SECTIONS } from '../../../lib/wiki-sections.constant';
import { WikiArticle, WikiAuthorNameService, WikiDraft } from '@entities/wiki';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { WikiArticleViewComponent } from '../../wiki-article-view/wiki-article-view.component';

/**
 * Состояние страницы статьи.
 */
type WikiPageState = 'loading' | 'ready' | 'not-found';

/**
 * Страница статьи вики.
 *
 * Адрес статьи — `/wiki/<адрес>`. Статьи приезжают с сервера в `WikiStoreService`;
 * гость видит опубликованные, редактор — вместе с черновиками. Адрес читается
 * из `paramMap`, поэтому переход по ссылке внутри статьи меняет текст,
 * а не только адрес.
 */
@Component({
    selector: 'app-wiki-article-page',
    imports: [WikiArticleViewComponent, EmptyStateComponent, TuiIcon, TranslatePipe, SkeletonComponent, RouterLink],
    templateUrl: './wiki-article-page.component.html',
    // Стили ряда кнопок и его отступов: без этого файла страница брала только
    // базовые классы, и кнопка «Редактировать» оставалась большой.
    styleUrl: './wiki-article-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiArticlePageComponent {
    private readonly store = inject(WikiStoreService);
    private readonly route = inject(ActivatedRoute);
    private readonly user = inject(UserService);
    private readonly authorNames = inject(WikiAuthorNameService);
    private readonly router = inject(Router);

    /**
     * Сайт пререндерится: серверный проход данные не грузит и скелетона не рисует.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Адрес статьи из маршрута. Меняется вместе с адресом, без пересоздания
     * компонента: Angular переиспользует страницу при переходе `wiki/:slug`.
     */
    private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')), {
        initialValue: this.route.snapshot.paramMap.get('slug') ?? '',
    });

    /**
     * Состояние страницы: пока данные едут, показываем скелетон.
     */
    protected readonly state = signal<WikiPageState>('loading');

    /**
     * Редактор правит статью напрямую; игрок приходит предложить правку.
     */
    protected readonly isEditor = this.user.roles.includes(Role.admin);

    /**
     * Кнопка нажата, редактор открывается.
     *
     * Переход начинается только после того, как браузер скачает чанк редактора,
     * поэтому без этого признака первые доли секунды после клика выглядят так,
     * будто ничего не произошло.
     */
    protected readonly opening = signal(false);

    /**
     * Статья по адресу из маршрута.
     */
    protected readonly article = computed<WikiArticle | null>(() => this.store.bySlug(this.slug()));

    /**
     * Поля статьи, которые показывает просмотр.
     */
    protected readonly draft = computed<WikiDraft | null>(() => {
        const article = this.article();
        return article ? toDraft(article) : null;
    });

    /**
     * Разобранный текст статьи: HTML, оглавление, картинки и счётчик слов.
     */
    protected readonly render = computed(() => {
        const article = this.article();

        return article
            ? renderWikiMarkdown(article.body, {
                  // «См. также» и ссылки [[адрес]] подписываем названием статьи из хранилища.
                  resolveArticle: (slug) => this.store.bySlug(slug)?.title ?? null,
                  // Ссылка [[player:id]] показывает текущий ник: id не меняется при смене ника.
                  resolvePlayer: (id) => this.authorNames.name(id),
              })
            : null;
    });

    /**
     * Раздел статьи — для хлебных крошек в шапке страницы.
     */
    protected readonly sectionLabel = computed(() => {
        const id = this.article()?.sectionId;
        return id ? (WIKI_SECTIONS.find((item) => item.id === id) ?? null) : null;
    });

    constructor() {
        // Список грузим целиком: из него подписываются «См. также» и ссылки [[адрес]],
        // а заодно он и есть снимок, по которому страница находит статью. Пока
        // снимок едет, показываем скелетон, чтобы не мигало «не найдена».
        if (this.isBrowser) {
            effect(() => void this.load(this.slug()));
        }

        // Ники для ссылок [[player:id]] догружаем по мере появления в тексте;
        // разбор пересчитается сам, потому что name() читает сигнал.
        effect(() => {
            const ids = this.render()?.playerIds ?? [];

            untracked(() => void this.authorNames.resolve(ids));
        });
    }

    /**
     * Загружает статью по адресу и переводит страницу в её состояние.
     *
     * Ответ на адрес, с которого читатель уже ушёл, состояние не трогает:
     * пока он ехал, адрес успел смениться.
     *
     * @param slug Адрес статьи.
     */
    private async load(slug: string): Promise<void> {
        this.state.set('loading');

        await this.store.load();

        if (this.slug() !== slug) {
            return;
        }

        let article = this.store.bySlug(slug);

        if (!article) {
            // Статья может быть за пределами снимка: черновик или 51-я по счёту.
            article = await this.store.loadBySlug(slug);
        }

        if (this.slug() !== slug) {
            return;
        }

        this.state.set(article ? 'ready' : 'not-found');

        if (article && !this.route.snapshot.fragment) {
            window.scrollTo({ top: 0 });
        }
    }

    /**
     * Название статьи по адресу — для карточек «См. также».
     *
     * @param slug Адрес статьи.
     */
    protected resolveTitle(slug: string): string | null {
        return this.store.bySlug(slug)?.title ?? null;
    }
}

/**
 * Отбрасывает служебные поля статьи, оставляя редактируемые.
 *
 * @param article Статья из хранилища.
 */
function toDraft(article: WikiArticle): WikiDraft {
    return {
        title: article.title,
        slug: article.slug,
        sectionId: article.sectionId,
        lead: article.lead,
        cover: article.cover,
        tags: article.tags,
        gameVersion: article.gameVersion,
        quickAnswer: article.quickAnswer,
        related: article.related,
        body: article.body,
    };
}
