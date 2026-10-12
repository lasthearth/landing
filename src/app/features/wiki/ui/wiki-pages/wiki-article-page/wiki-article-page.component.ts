import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { Role, UserService } from '@entities/user';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { WikiStoreService } from '../../../api/wiki-store.service';
import { renderWikiMarkdown } from '../../../lib/render-wiki-markdown.function';
import { WIKI_SECTIONS } from '../../../lib/wiki-sections.constant';
import { WikiArticle, WikiDraft } from '@entities/wiki';
import { WikiArticleViewComponent } from '../../wiki-article-view/wiki-article-view.component';

/**
 * Страница статьи вики.
 *
 * Адрес статьи — `/wiki/<адрес>`. Пока вики не переехала на сервер, статья
 * ищется в `localStorage` (`WikiStoreService`): читатель видит только то,
 * что сохранено в его браузере, а черновики — только администраторы.
 */
@Component({
    selector: 'app-wiki-article-page',
    imports: [WikiArticleViewComponent, EmptyStateComponent, TuiIcon, TranslatePipe],
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

    private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

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
    protected readonly article = computed<WikiArticle | null>(() => this.store.bySlug(this.slug));

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

    /**
     * Название статьи по адресу — для карточек «См. также».
     *
     * @param slug Адрес статьи.
     */
    constructor() {
        // Загружаем список целиком, а не одну статью: из него подписываются
        // карточки «См. также» и ссылки [[адрес]] в тексте. Со списка сюда
        // обычно приходят уже с готовым снимком — тогда запрос один и тот же,
        // и повторно он не уходит.
        afterNextRender(() => void this.store.load());
    }

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
