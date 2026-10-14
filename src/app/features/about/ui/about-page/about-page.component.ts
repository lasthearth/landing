import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, I18nService, TranslatePipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { ServerInformationService } from '@core/services/server-information.service';
import { SettlementService, SettlementsTypes } from '@entities/settlement';
import { UserService } from '@entities/user';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { catchError, map, of } from 'rxjs';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Разделы страницы в порядке чтения.
 */
const SECTIONS = ['concept', 'settlements', 'diplomacy', 'economy', 'differences', 'start'] as const;

/**
 * Страница «О сервере» `/about`.
 *
 * Разделы идут фиксированным порядком, тексты лежат в словаре: владелец пишет
 * их сам (задача 010), а структура, разметка и разметка пути уже готовы.
 * Внизу — те же числа, что на главной: онлайн, поселения и игроки.
 */
@Component({
    selector: 'app-about-page',
    imports: [AmountPipe, RouterLink, TranslatePipe, TuiIcon, BreadcrumbsComponent, PageHeaderComponent],
    templateUrl: './about-page.component.html',
    styleUrl: './about-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
    private readonly serverInfo = inject(ServerInformationService);
    private readonly settlements = inject(SettlementService);
    private readonly users = inject(UserService);
    private readonly seo = inject(SeoService);
    protected readonly i18n = inject(I18nService);

    /**
     * Разделы страницы.
     */
    protected readonly sections = SECTIONS;

    /**
     * Уровни поселений: имена берём из словаря поселений.
     */
    protected readonly levels: readonly SettlementsTypes[] = [
        SettlementsTypes.camp,
        SettlementsTypes.village,
        SettlementsTypes.township,
        SettlementsTypes.city,
        SettlementsTypes.region,
    ];

    /**
     * Онлайн сервера.
     */
    protected readonly online = toSignal(
        this.serverInfo.getOnlinePlayersCount$().pipe(catchError(() => of(null))),
        { initialValue: null }
    );

    /**
     * Количество поселений.
     */
    protected readonly settlementsCount = toSignal(
        this.settlements.getSettlements().pipe(
            map((list) => list.length),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Сколько игроков попало в статистику сервера.
     */
    protected readonly playersCount = toSignal(
        this.users.getAllPlayersStats$().pipe(
            map((list) => list.length),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Хлебные крошки страницы.
     */
    protected readonly crumbs = computed(() => [
        { label: this.i18n.translate('about.breadcrumb') },
    ]);

    public constructor() {
        effect(() => this.applySeo());
    }

    /**
     * Имя уровня поселения из словаря поселений.
     *
     * @param level Уровень поселения.
     * @returns Переведённое имя.
     */
    protected levelName(level: SettlementsTypes): string {
        return this.i18n.translate('settlements.types.' + SettlementsTypes[level]);
    }

    /**
     * Ставит заголовок, описание, канонический адрес и разметку пути.
     */
    private applySeo(): void {
        this.seo.setSeoTags({
            // Заголовок раздела уже полный: «Last Hearth — ролевой сервер Vintage Story».
            title: this.i18n.translate('about.title'),
            description: this.i18n.translate('about.sections.concept.text'),
            robots: 'index, follow, max-image-preview:large',
            url: SITE_URL + '/about',
        });

        this.seo.setBreadcrumbs(this.crumbs(), this.i18n.translate('shared.breadcrumbs.home'));
    }
}
