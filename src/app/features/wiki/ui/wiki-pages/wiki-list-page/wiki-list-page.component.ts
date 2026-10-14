import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { Role, UserService } from '@entities/user';
import { WikiAuthorNameService } from '@entities/wiki';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { WikiStoreService } from '../../../api/wiki-store.service';
import { WIKI_SECTIONS } from '../../../lib/wiki-sections.constant';
import { WikiArticle, WikiSectionId } from '@entities/wiki';

/**
 * Карточка статьи в списке.
 */
interface WikiCard {
    readonly article: WikiArticle;
    /**
     * Вступление, обрезанное под карточку.
     */
    readonly lead: string;
    /**
     * Время чтения в минутах.
     */
    readonly minutes: number;
    /**
     * `background-image` обложки. Без своей обложки — скриншот раздела.
     */
    readonly coverImage: string;
    /**
     * Обложка взята у раздела, а не у статьи: рисуется приглушённой.
     */
    readonly fallbackCover: boolean;
    /**
     * Вертикальная точка кадра обложки, проценты.
     */
    readonly coverFocus: number;
    /**
     * Первые теги статьи: подпись разворотного листа.
     */
    readonly tags: readonly string[];
}

/**
 * Сколько тегов помещается в подпись разворотного листа.
 */
const LEAD_TAG_LIMIT = 3;

/**
 * С какого числа карточек первая раскрывается на всю ширину.
 */
const LEAD_SPREAD_MIN = 3;

/**
 * Порядок статей в списке.
 */
type WikiSort = 'fresh' | 'title';

/**
 * Вариант фильтра со счётчиком.
 */
interface WikiOption<T> {
    readonly value: T;
    readonly count: number;
}

/**
 * Сколько символов вступления помещается в карточку.
 */
const LEAD_LIMIT = 160;

/**
 * Сколько карточек показывать до кнопки «Показать ещё».
 */
const PAGE_SIZE = 12;

/**
 * Тег попадает в фильтр, если встречается хотя бы у стольких статей.
 */
const TAG_MIN_COUNT = 2;

/**
 * Страница вики: статьи, сгруппированные по разделам.
 *
 * Статьи приезжают с сервера в `WikiStoreService` целым снимком: гость видит
 * опубликованные, редактор — вместе с черновиками. Пока снимок едет, вместо
 * «статей пока нет» показываются карточки-заглушки.
 *
 * Поиск и фильтры хранятся в адресе страницы, поэтому ссылкой на подборку
 * можно поделиться.
 */
@Component({
    selector: 'app-wiki-list-page',
    imports: [PageHeaderComponent, EmptyStateComponent, TuiIcon, TranslatePipe, RouterLink, SkeletonComponent],
    templateUrl: './wiki-list-page.component.html',
    styleUrl: './wiki-list-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiListPageComponent {
    /**
     * Хранилище статей: по его признаку загрузки отличие «ещё не знаем» от «пусто».
     */
    protected readonly store = inject(WikiStoreService);
    private readonly user = inject(UserService);
    private readonly authorNames = inject(WikiAuthorNameService);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    /**
     * Порядок сортировки в меню.
     */
    protected readonly sortKeys: readonly WikiSort[] = ['fresh', 'title'];

    /**
     * Черновики показываем только администраторам.
     */
    protected readonly isAdmin = computed(() => this.user.roles.includes(Role.admin));

    /**
     * Вошёл ли посетитель: предлагать статьи может только он.
     */
    protected readonly isAuthenticated = toSignal(this.user.authState$, { initialValue: false });

    /**
     * Статьи, доступные читателю: опубликованные всем, черновики — админам.
     */
    protected readonly articles = computed(() =>
        this.store.articles().filter((article) => article.status === 'published' || this.isAdmin())
    );

    /**
     * Поисковый запрос; начальное значение — из адреса.
     */
    protected readonly search = signal(this.route.snapshot.queryParamMap.get('q') ?? '');

    /**
     * Выбранный раздел; начальное значение — из адреса.
     */
    protected readonly section = signal<WikiSectionId | null>(
        (this.route.snapshot.queryParamMap.get('section') as WikiSectionId | null) ?? null
    );

    /**
     * Выбранный тег; начальное значение — из адреса.
     */
    protected readonly tag = signal<string | null>(this.route.snapshot.queryParamMap.get('tag'));

    /**
     * Порядок сортировки; начальное значение — из адреса.
     */
    protected readonly sort = signal<WikiSort>(
        this.route.snapshot.queryParamMap.get('sort') === 'title' ? 'title' : 'fresh'
    );

    /**
     * Сколько карточек показано; увеличивается кнопкой «Показать ещё».
     */
    protected readonly visible = signal(PAGE_SIZE);

    /**
     * Теги, встречающиеся у нескольких статей, со счётчиками.
     */
    protected readonly tagOptions = computed<readonly WikiOption<string>[]>(() => {
        const counts = new Map<string, number>();

        for (const article of this.articles()) {
            for (const tag of article.tags) {
                const value = tag.trim();

                if (value) {
                    counts.set(value, (counts.get(value) ?? 0) + 1);
                }
            }
        }

        return [...counts.entries()]
            .filter(([, count]) => count >= TAG_MIN_COUNT)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    });

    /**
     * Статьи после поиска и фильтров, в выбранном порядке.
     */
    private readonly filtered = computed<readonly WikiArticle[]>(() => {
        const query = this.search().trim().toLocaleLowerCase(this.i18n.language());
        const section = this.section();
        const tag = this.tag();

        const result = this.articles()
            .filter((article) => !section || article.sectionId === section)
            .filter((article) => !tag || article.tags.some((item) => item.trim() === tag))
            .filter((article) => !query || this.matches(article, query));

        return this.sort() === 'title'
            ? [...result].sort((a, b) => (a.title || a.slug).localeCompare(b.title || b.slug, this.i18n.language()))
            : result;
    });

    /**
     * Карточки для показа с учётом «Показать ещё».
     */
    protected readonly cards = computed<readonly WikiCard[]>(() =>
        this.filtered()
            .slice(0, this.visible())
            .map((article) => ({
                article,
                lead: cut(article.lead.trim(), LEAD_LIMIT),
                minutes: Math.max(1, Math.round(countWords(article.body) / 200)),
                // Адрес в кавычках, чтобы скобки в нём не ломали `url()`.
                coverImage: `url(${JSON.stringify(article.cover?.url || this.sectionImage(article.sectionId))})`,
                fallbackCover: !article.cover?.url,
                coverFocus: article.cover?.url ? article.cover.focus : 50,
                tags: article.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, LEAD_TAG_LIMIT),
            }))
    );

    /**
     * Сколько статей доступно — до фильтров.
     */
    protected readonly total = computed(() => this.articles().length);

    /**
     * Сколько статей прошло фильтры.
     */
    protected readonly found = computed(() => this.filtered().length);

    /**
     * Ряд заглушек, пока снимок не загрузился: столько же карточек, что и на экране.
     */
    protected readonly skeletonCards: readonly number[] = [0, 1, 2, 3, 4, 5];

    /**
     * Разделы отдельными адресами: фильтр `?section=` поисковик за страницу
     * не считает, поэтому у каждого раздела есть своя страница `/wiki/razdel/<id>`.
     */
    protected readonly sectionLinks = WIKI_SECTIONS;

    /**
     * Разделы плитками: все шесть, со скриншотом и числом статей.
     * Пустой раздел тоже показан — в него можно предложить статью.
     */
    protected readonly sectionTiles = computed(() => {
        const counts = new Map<WikiSectionId, number>();

        for (const article of this.articles()) {
            counts.set(article.sectionId, (counts.get(article.sectionId) ?? 0) + 1);
        }

        return WIKI_SECTIONS.map((item) => ({
            ...item,
            count: counts.get(item.id) ?? 0,
            background: `url(${JSON.stringify(item.image)})`,
        }));
    });

    /**
     * Разворотный лист на всю ширину — только когда под ним есть ряд карточек.
     * При одной-двух статьях разворот оставлял бы одинокую карточку под собой.
     */
    protected readonly leadSpread = computed(() => this.cards().length >= LEAD_SPREAD_MIN);

    /**
     * Остались ли статьи за кнопкой «Показать ещё».
     */
    protected readonly hasMore = computed(() => this.found() > this.visible());

    /**
     * Есть ли вообще доступные статьи — до фильтров.
     */
    protected readonly hasAny = computed(() => this.total() > 0);

    /**
     * Активен ли хотя бы один фильтр или поиск.
     */
    protected readonly hasFilters = computed(
        () => this.search().trim().length > 0 || this.section() !== null || this.tag() !== null
    );

    /**
     * Ищет совпадение в названии, адресе, вступлении и тегах.
     *
     * @param article Статья.
     * @param query Запрос в нижнем регистре.
     */
    constructor() {
        // Список приезжает с сервера; гость получает опубликованные статьи,
        // редактор — вместе с черновиками. Загрузка идёт и при серверном рендере:
        // робот должен увидеть статьи в HTML, а не скелетоны.
        void this.store.load();

        // Подписи авторов подтягиваются по мере появления статей: сервер отдаёт
        // идентификатор, а читать идентификатор вместо имени незачем.
        effect(() => {
            const ids = this.articles().map((article) => article.createdBy);

            untracked(() => void this.authorNames.resolve(ids));
        });
    }

    /**
     * Имя автора для подписи на карточке.
     *
     * @param article Статья.
     */
    protected authorLabel(article: WikiArticle): string {
        return this.authorNames.label(article.createdBy);
    }

    private matches(article: WikiArticle, query: string): boolean {
        const haystack = [article.title, article.slug, article.lead, ...article.tags]
            .join(' ')
            .toLocaleLowerCase(this.i18n.language());

        return haystack.includes(query);
    }

    /**
     * Запоминает введённый запрос и переписывает адрес.
     *
     * @param event Событие ввода.
     */
    protected onQueryInput(event: Event): void {
        this.search.set((event.target as HTMLInputElement).value);
        this.applyUrl();
    }

    /**
     * Включает раздел или выключает его повторным нажатием.
     *
     * @param value Идентификатор раздела.
     */
    protected toggleSection(value: WikiSectionId): void {
        this.section.update((current) => (current === value ? null : value));
        this.applyUrl();
    }

    /**
     * Включает тег или выключает его повторным нажатием.
     *
     * @param value Тег.
     */
    protected toggleTag(value: string): void {
        this.tag.update((current) => (current === value ? null : value));
        this.applyUrl();
    }

    /**
     * Выбирает порядок сортировки.
     *
     * @param value Порядок.
     */
    protected setSort(value: WikiSort): void {
        this.sort.set(value);
        this.applyUrl();
    }

    /**
     * Показывает следующие карточки.
     */
    protected showMore(): void {
        this.visible.update((value) => value + PAGE_SIZE);
    }

    /**
     * Сбрасывает поиск и фильтры.
     */
    protected resetFilters(): void {
        this.search.set('');
        this.section.set(null);
        this.tag.set(null);
        this.applyUrl();
    }

    /**
     * Отдаёт состояние поиска и фильтров в адрес страницы.
     */
    private applyUrl(): void {
        this.visible.set(PAGE_SIZE);
        void this.router.navigate([], {
            queryParams: {
                q: this.search().trim() || null,
                section: this.section(),
                tag: this.tag(),
                sort: this.sort() === 'fresh' ? null : this.sort(),
            },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /**
     * Подпись раздела.
     *
     * @param id Идентификатор раздела.
     */
    protected sectionLabel(id: WikiSectionId): string {
        return this.i18n.translate(`wiki.sections.${id}`);
    }

    /**
     * Команды ссылки на статью — без перезагрузки приложения.
     *
     * @param article Статья.
     */
    protected articleLink(article: WikiArticle): readonly string[] {
        return ['/wiki', article.slug];
    }

    /**
     * Короткая подпись времени чтения для печати на карточке.
     *
     * @param minutes Минуты.
     */
    protected minutesShort(minutes: number): string {
        return this.i18n.translate('wiki.public.minutesShort', { count: minutes });
    }

    /**
     * Ведёт пятно света очага за курсором: пишет координаты в переменные
     * карточки, диск света едет на них через `transform`.
     *
     * @param event Движение указателя по карточке.
     */
    protected onGlowMove(event: PointerEvent): void {
        // Сенсор и уменьшенное движение живут без света: ховера нет,
        // а декоративное движение запрещено настройкой системы.
        if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const card = event.currentTarget as HTMLElement;
        const box = card.getBoundingClientRect();

        card.style.setProperty('--glow-x', `${Math.round(event.clientX - box.left)}px`);
        card.style.setProperty('--glow-y', `${Math.round(event.clientY - box.top)}px`);
    }

    /**
     * Читаемый вид даты правки.
     *
     * @param value Дата в ISO.
     */
    protected updatedLabel(value: string): string {
        return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(value));
    }
    /**
     * Скриншот раздела — обложка статьи, у которой нет своей.
     *
     * @param id Раздел.
     * @returns Адрес картинки.
     */
    private sectionImage(id: WikiSectionId): string {
        return WIKI_SECTIONS.find((item) => item.id === id)?.image ?? WIKI_SECTIONS[0].image;
    }

    /**
     * «1 статья», «3 статьи», «7 статей» — число статей раздела словами.
     *
     * @param count Число статей.
     * @returns Подпись.
     */
    protected articleCount(count: number): string {
        if (!count) {
            return this.i18n.translate('wiki.public.countNone');
        }

        const mod10 = count % 10;
        const mod100 = count % 100;
        const form =
            this.i18n.language() === 'en'
                ? count === 1
                    ? 'one'
                    : 'many'
                : mod10 === 1 && mod100 !== 11
                ? 'one'
                : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
                  ? 'few'
                  : 'many';

        return this.i18n.translate(`wiki.public.count.${form}`, { count });
    }
}

/**
 * Обрезает текст по границе слова.
 *
 * @param text Исходный текст.
 * @param limit Предел в символах.
 */
function cut(text: string, limit: number): string {
    if (text.length <= limit) {
        return text;
    }

    const sliced = text.slice(0, limit);
    const lastSpace = sliced.lastIndexOf(' ');

    return `${(lastSpace > limit / 2 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

/**
 * Считает слова в тексте разметки.
 *
 * @param source Текст статьи.
 */
function countWords(source: string): number {
    return source.split(/\s+/).filter(Boolean).length;
}
