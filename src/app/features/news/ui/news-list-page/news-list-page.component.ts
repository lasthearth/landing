import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AmountPipe, I18nService, TranslatePipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { mapDtoToNews, News, NewsApiService } from '@entities/news';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { catchError, map, of } from 'rxjs';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Страница «Новости» `/news`: лента всех новостей сервера.
 *
 * До этого новости жили только блоком на главной: отдельного адреса у ленты
 * не было, и робот видел лишь последнюю новость. Список собирается заранее,
 * поэтому карточки уже в исходном HTML.
 */
@Component({
    selector: 'app-news-list-page',
    imports: [
        AmountPipe,
        RouterLink,
        TranslatePipe,
        BreadcrumbsComponent,
        EmptyStateComponent,
        PageHeaderComponent,
        RelativeTimeComponent,
    ],
    templateUrl: './news-list-page.component.html',
    styleUrl: './news-list-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsListPageComponent {
    private readonly api = inject(NewsApiService);
    private readonly seo = inject(SeoService);
    private readonly i18n = inject(I18nService);

    /**
     * Новости, свежие сверху.
     */
    protected readonly news = toSignal(
        this.api.getList().pipe(
            map((list) =>
                list
                    .map(mapDtoToNews)
                    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
            ),
            catchError(() => of<News[]>([]))
        ),
        { initialValue: [] as News[] }
    );

    /**
     * Хлебные крошки страницы.
     */
    protected readonly crumbs = computed(() => [{ label: this.i18n.translate('news.list.title') }]);

    public constructor() {
        effect(() => this.applySeo());
    }

    /**
     * Ставит заголовок, описание, канонический адрес и разметку пути.
     */
    private applySeo(): void {
        this.seo.setSeoTags({
            title: this.i18n.translate('news.list.title') + ' — Last Hearth',
            description: this.i18n.translate('news.list.subtitle'),
            robots: 'index, follow, max-image-preview:large',
            url: SITE_URL + '/news',
        });

        this.seo.setBreadcrumbs(this.crumbs(), this.i18n.translate('shared.breadcrumbs.home'));
    }
}
