import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { KEY_POINT_SCHEMES } from '../../config/key-point-schemes.constant';
import { KeyPointPlannerStore } from '../../model/key-point-planner.store';
import { resolveVariant } from '../../lib/resolve-variant.function';
import { KeyPointScheme } from '../../model/key-point-scheme.interface';
import { UpgradeSchemeComponent } from '../upgrade-scheme/upgrade-scheme.component';

/**
 * Адрес сайта для канонической ссылки.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Страница «Ключевые точки» `/key-points`: схемы прокачки по типам точек.
 *
 * Вверху — переключатель типов (шахта, форт, воздушная гавань, промышленная,
 * торговая), под ним — интерактивная схема выбранного типа. Выбранный тип
 * лежит в адресе (`?point=fort`), чтобы ссылку на схему можно было скинуть в Discord.
 */
@Component({
    selector: 'app-key-points-page',
    imports: [TranslatePipe, TuiIcon, BreadcrumbsComponent, PageHeaderComponent, UpgradeSchemeComponent],
    templateUrl: './key-points-page.component.html',
    styleUrl: './key-points-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [KeyPointPlannerStore],
})
export class KeyPointsPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly seo = inject(SeoService);
    protected readonly i18n = inject(I18nService);

    /**
     * Все схемы в порядке вкладок.
     */
    protected readonly schemes = KEY_POINT_SCHEMES;

    /**
     * Тип точки из адреса.
     */
    private readonly pointParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('point'))), {
        initialValue: null,
    });

    /**
     * Открытая схема: из адреса, а при неизвестном значении — первая.
     */
    protected readonly active = computed<KeyPointScheme>(
        () => this.schemes.find((scheme) => scheme.id === this.pointParam()) ?? this.schemes[0]
    );

    /**
     * Отдельная точка из адреса (`?variant=`), например конкретная шахта.
     */
    private readonly variantParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('variant'))), {
        initialValue: null,
    });

    /**
     * Схема для показа: у типа с отдельными точками — схема выбранной точки.
     */
    protected readonly shown = computed(() => resolveVariant(this.active(), this.variantParam()));

    /**
     * Ключ выбранной отдельной точки (или `null`, если у типа их нет).
     */
    protected readonly activeVariant = computed(() => {
        const variants = this.active().variants;
        return variants?.length ? (variants.find((item) => item.key === this.variantParam()) ?? variants[0]).key : null;
    });

    /**
     * Хлебные крошки страницы.
     */
    protected readonly crumbs = computed(() => [{ label: this.i18n.translate('keyPoints.breadcrumb') }]);

    public constructor() {
        effect(() => this.applySeo());
    }

    /**
     * Открывает схему другого типа точки.
     *
     * @param scheme Схема, которую нужно показать.
     */
    protected open(scheme: KeyPointScheme): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { point: scheme.id === this.schemes[0].id ? null : scheme.id, variant: null },
            replaceUrl: true,
        });
    }

    /**
     * Открывает отдельную точку внутри типа (например, другую шахту).
     *
     * @param key Ключ отдельной точки.
     */
    protected openVariant(key: string): void {
        const first = this.active().variants?.[0]?.key;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { variant: key === first ? null : key },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /**
     * Переводит фокус между вкладками стрелками, как в обычном списке вкладок.
     *
     * @param event Нажатие клавиши на вкладке.
     * @param index Номер вкладки, на которой стоит фокус.
     */
    protected onTabKeydown(event: KeyboardEvent, index: number): void {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) {
            return;
        }

        event.preventDefault();
        const next = (index + step + this.schemes.length) % this.schemes.length;
        this.open(this.schemes[next]);

        const tabs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs?.[next]?.focus();
    }

    /**
     * Ставит заголовок, описание, канонический адрес и разметку пути.
     */
    private applySeo(): void {
        this.seo.setSeoTags({
            title: this.i18n.translate('keyPoints.seoTitle'),
            description: this.i18n.translate('keyPoints.intro'),
            robots: 'index, follow, max-image-preview:large',
            url: SITE_URL + '/key-points',
        });

        this.seo.setBreadcrumbs(this.crumbs(), this.i18n.translate('shared.breadcrumbs.home'));
    }
}
