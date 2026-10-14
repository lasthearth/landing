import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { ServerResponseService } from '@core/services/server-response.service';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { map } from 'rxjs';
import { WikiStoreService } from '../../../api/wiki-store.service';
import { WIKI_SECTIONS } from '../../../lib/wiki-sections.constant';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Раздел вики отдельным адресом: `/wiki/razdel/<раздел>`.
 *
 * Фильтр `?section=` поисковик за страницу не считает, поэтому у каждого раздела
 * свой адрес со своим заголовком и описанием. Старый фильтр продолжает работать.
 */
@Component({
    selector: 'app-wiki-section-page',
    imports: [
        RouterLink,
        TranslatePipe,
        TuiIcon,
        BreadcrumbsComponent,
        EmptyStateComponent,
        PageHeaderComponent,
        SkeletonComponent,
    ],
    templateUrl: './wiki-section-page.component.html',
    styleUrl: './wiki-section-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiSectionPageComponent {
    protected readonly store = inject(WikiStoreService);
    private readonly route = inject(ActivatedRoute);
    private readonly seo = inject(SeoService);
    private readonly i18n = inject(I18nService);
    private readonly response = inject(ServerResponseService);

    /**
     * Раздел из адреса.
     */
    private readonly sectionId = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('section') ?? '')),
        { initialValue: this.route.snapshot.paramMap.get('section') ?? '' }
    );

    /**
     * Раздел или `null`, если адрес неизвестный.
     */
    protected readonly section = computed(() => WIKI_SECTIONS.find((item) => item.id === this.sectionId()) ?? null);

    /**
     * Подпись раздела.
     */
    protected readonly name = computed(() => {
        const section = this.section();

        return section ? this.i18n.translate(`wiki.sections.${section.id}`) : '';
    });

    /**
     * Описание раздела — 2–3 предложения из словаря.
     */
    protected readonly description = computed(() => {
        const section = this.section();

        return section ? this.i18n.translate(`wiki.section.description.${section.id}`) : '';
    });

    /**
     * Статьи раздела.
     */
    protected readonly articles = computed(() =>
        this.store.articles().filter((article) => article.sectionId === this.sectionId())
    );

    /**
     * Хлебные крошки: Вики → раздел.
     */
    protected readonly crumbs = computed(() => [
        { label: this.i18n.translate('wiki.public.title'), link: '/wiki' },
        { label: this.name() },
    ]);

    public constructor() {
        // Статьи нужны и серверному рендеру: робот должен видеть список раздела.
        void this.store.load();

        effect(() => this.applySeo());
    }

    /**
     * Ставит заголовок, описание, канонический адрес и разметку пути.
     */
    private applySeo(): void {
        const section = this.section();

        if (!section) {
            this.response.setStatus(404);
            this.seo.setSeoTags({
                title: `${this.i18n.translate('wiki.public.notFound')} — Last Hearth`,
                description: this.i18n.translate('wiki.public.notFoundHint'),
                robots: 'noindex, follow',
            });

            return;
        }

        this.seo.setSeoTags({
            title: this.i18n.translate('wiki.section.title', { name: this.name() }),
            description: this.description(),
            robots: 'index, follow, max-image-preview:large',
            url: `${SITE_URL}/wiki/razdel/${section.id}`,
        });

        this.seo.setBreadcrumbs(this.crumbs(), this.i18n.translate('shared.breadcrumbs.home'));
    }
}
