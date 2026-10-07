import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, map, Observable, of, startWith, switchMap, take, tap } from 'rxjs';
import { mapDtoToNews, News, NewsApiService, NewsDto } from '@entities/news';
import { UserService } from '@entities/user';
import { SeoService } from '@core/services/seo.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button';
import { NewsCardComponent } from '../news-card/news-card.component';
import { NewsSkeletonComponent } from '../news-skeleton/news-skeleton.component';
import { NewsPageState } from '../../model/news-page-state';
import { ReactionsComponent } from '@features/reactions';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Сколько других новостей показывать под статьёй.
 */
const OTHER_NEWS_COUNT = 2;

/**
 * Страница отдельной новости: `/news/:id`.
 *
 * Новость берётся из общего списка (`GET /news`), а не из `GET /news/{id}`:
 * по контракту запрос по id увеличивает счётчик просмотров при каждом открытии,
 * а просмотр уже учитывается через `POST /news/{id}/views` (один раз на игрока).
 * Запрос по id используется только как запасной, если новости нет в списке.
 */
@Component({
    standalone: true,
    selector: 'app-news-page',
    imports: [
        RouterLink,
        TuiIcon,
        TranslatePipe,
        ImageLoaderComponent,
        NewsCardComponent,
        NewsSkeletonComponent,
        RelativeTimeComponent,
        ShareButtonComponent,
        ReactionsComponent,
    ],
    templateUrl: './news-page.component.html',
    styleUrl: './news-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsPageComponent {
    /**
     * Текущий маршрут.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * API новостей.
     */
    private readonly api = inject(NewsApiService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * SEO-теги страницы.
     */
    private readonly seo = inject(SeoService);

    /**
     * Переводы.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка уничтожения.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Количество просмотров (обновляется после регистрации просмотра).
     */
    protected readonly viewCount = signal(0);

    /**
     * Имя автора, если удалось его получить (только для авторизованных).
     */
    protected readonly authorName = signal('');

    /**
     * Состояние страницы.
     */
    protected readonly state = toSignal(
        this.route.paramMap.pipe(
            map((params) => params.get('id') ?? ''),
            tap(() => this.scrollToTop()),
            switchMap((id) => this.load(id).pipe(startWith<NewsPageState>({ status: 'loading' }))),
            tap((state) => this.onStateChange(state))
        ),
        { initialValue: { status: 'loading' } as NewsPageState }
    );

    /**
     * Загруженная новость или null.
     */
    protected readonly news = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.news : null;
    });

    /**
     * Другие новости для блока под статьёй.
     */
    protected readonly others = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.others : [];
    });

    /**
     * Загружает новость и список других новостей.
     *
     * @param id Идентификатор новости.
     */
    private load(id: string): Observable<NewsPageState> {
        return this.api.getList().pipe(
            catchError(() => of<NewsDto[]>([])),
            switchMap((list) => {
                const sorted = list
                    .map(mapDtoToNews)
                    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
                const others = sorted.filter((item) => item.id !== id).slice(0, OTHER_NEWS_COUNT);
                const found = sorted.find((item) => item.id === id);

                if (found) {
                    return of<NewsPageState>({ status: 'ready', news: found, others });
                }

                return this.api.getById(id).pipe(
                    map((dto): NewsPageState => ({ status: 'ready', news: mapDtoToNews(dto), others })),
                    catchError(() => of<NewsPageState>({ status: 'not-found' }))
                );
            })
        );
    }

    /**
     * Реакция на смену состояния: SEO-теги, счётчик, автор, регистрация просмотра.
     *
     * @param state Новое состояние.
     */
    private onStateChange(state: NewsPageState): void {
        if (state.status === 'not-found') {
            this.seo.setSeoTags({
                title: this.i18n.translate('news.page.notFoundTitle') + ' — Last Hearth',
                description: this.i18n.translate('news.page.notFoundText'),
                keywords: '',
                robots: 'noindex, follow',
            });
            return;
        }

        if (state.status !== 'ready') {
            return;
        }

        const { news } = state;
        this.viewCount.set(news.viewCount);
        this.authorName.set('');
        this.applySeo(news);
        this.resolveAuthor(news);
        this.registerView(news.id);
    }

    /**
     * Выставляет SEO-теги новости.
     *
     * @param news Новость.
     */
    private applySeo(news: News): void {
        const text = news.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const description = text.length > 160 ? `${text.slice(0, 157)}...` : text;

        this.seo.setSeoTags({
            title: `${news.title} — ${this.i18n.translate('news.page.seoSuffix')}`,
            description,
            keywords: '',
            robots: 'index, follow, max-image-preview:large',
            url: `${SITE_URL}/news/${news.id}`,
            type: 'article',
            locale: 'ru_RU',
            siteName: 'Last Hearth — ролевой сервер Vintage Story',
            image: news.preview || `${SITE_URL}/og-image.jpg`,
            imageAlt: news.title,
        });
    }

    /**
     * Подставляет имя автора вместо идентификатора (только для авторизованных,
     * как на главной: для гостей запрос профилей закрыт).
     *
     * @param news Новость.
     */
    private resolveAuthor(news: News): void {
        if (!news.createdBy || !this.isBrowser) {
            return;
        }

        this.userService.authState$
            .pipe(
                take(1),
                switchMap((isAuth) => (isAuth ? this.userService.getPlayersBatch$([news.createdBy]) : EMPTY)),
                catchError(() => EMPTY),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) => {
                const name = players.find((player) => player.user_id === news.createdBy)?.user_game_name;
                this.authorName.set(name ?? '');
            });
    }

    /**
     * Регистрирует просмотр авторизованного игрока.
     *
     * @param id Идентификатор новости.
     */
    private registerView(id: string): void {
        if (!this.isBrowser) {
            return;
        }

        this.userService.authState$
            .pipe(
                take(1),
                switchMap((isAuth) => (isAuth ? this.api.addView(id).pipe(catchError(() => EMPTY)) : EMPTY)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((count) => {
                if (count != null) {
                    this.viewCount.set(count);
                }
            });
    }

    /**
     * Прокручивает страницу наверх при открытии новости
     * (роутер приложения не сбрасывает прокрутку сам).
     */
    private scrollToTop(): void {
        if (this.isBrowser) {
            window.scrollTo({ top: 0 });
        }
    }
}
