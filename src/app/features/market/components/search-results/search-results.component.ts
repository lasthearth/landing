import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { DonateService } from '@entities/donate';
import { AnalyticsService } from '@core/services/analytics.service';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { mapShopItemToPrivilegeCard } from '../../lib/map-shop-item-to-privilege-card.function';
import { MarketSortKey } from '../../lib/market-sort-key.type';
import { sortPrivilegeCardsByKey } from '../../lib/sort-privilege-cards-by-key.function';
import { SHOP_CATEGORY_LABEL_KEY } from '../../lib/shop-category-label.constant';
import { createShopItemsLoader, ShopItemsLoader } from '../../lib/create-shop-items-loader.function';
import { openPurchaseDialog } from '../purchase-dialog/open-purchase-dialog.function';

/**
 * Результаты поиска по магазину: все категории одним списком строк.
 *
 * Покупатель с готовым интентом не листает категории: строка сразу
 * показывает название, категорию, цену и кнопку покупки.
 * Читает кэшированный поток товаров, лишних запросов не делает.
 */
@Component({
    selector: 'app-market-search-results',
    imports: [
        AmountPipe,
        TranslatePipe,
        TuiIcon,
        ImageLoaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        MarketGridSkeletonComponent,
    ],
    templateUrl: './search-results.component.html',
    styleUrl: './search-results.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketSearchResultsComponent implements OnDestroy {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Сервис аналитики: цель на покупку из строки результата.
     */
    private readonly analytics = inject(AnalyticsService);

    /**
     * Сервис явного обнаружения изменений.
     */
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    /**
     * Ключи подписей категорий для шаблона.
     */
    protected readonly categoryLabelKey = SHOP_CATEGORY_LABEL_KEY;

    /**
     * Все товары магазина карточками, до фильтра и сортировки.
     */
    private baseCards: PrivilegeCard[] = [];

    /**
     * Запрос поиска в нижнем регистре, пустая строка выключает фильтр.
     */
    private queryText = '';

    /**
     * Текущий ключ сортировки витрины.
     */
    private sort: MarketSortKey = 'price-asc';

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Загрузчик товаров: держит признаки загрузки и сбоя.
     */
    private readonly loader: ShopItemsLoader = createShopItemsLoader(
        this.donateService,
        this.changeDetectorRef,
        (items) => {
            this.baseCards = items.map(mapShopItemToPrivilegeCard);
            this.apply();
        }
    );

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = this.loader.loading;

    /**
     * Признак сбоя загрузки товаров.
     */
    protected readonly error = this.loader.error;

    /**
     * Строки результатов: фильтр по запросу и сортировка витрины.
     */
    protected rows: PrivilegeCard[] = [];

    constructor() {
        this.loader.load();
    }

    /**
     * Запрос поиска из панели магазина.
     */
    @Input()
    public set query(value: string) {
        this.queryText = value.trim().toLowerCase();
        this.apply();
    }

    /**
     * Ключ сортировки витрины из панели магазина.
     */
    @Input()
    public set sortKey(value: MarketSortKey) {
        this.sort = value;
        this.apply();
    }

    /**
     * Снимает подписку на поток товаров.
     */
    public ngOnDestroy(): void {
        this.loader.destroy();
    }

    /**
     * Повторно загружает список товаров после сбоя.
     */
    protected retryLoad(): void {
        this.loader.retry();
    }

    /**
     * Открывает диалог покупки товара из строки результата.
     *
     * @param card Карточка товара витрины.
     */
    protected buy(card: PrivilegeCard): void {
        if (openPurchaseDialog(this.dialogs, card)) {
            this.analytics.goal('market_buy_click', { item: card.title, source: 'search' });
        }
    }

    /**
     * Пересобирает строки: фильтр по названию и описанию, затем сортировка.
     */
    private apply(): void {
        const filtered = this.queryText
            ? this.baseCards.filter(
                  (card) =>
                      card.title.toLowerCase().includes(this.queryText) ||
                      (card.description ?? '').toLowerCase().includes(this.queryText)
              )
            : this.baseCards;
        this.rows = sortPrivilegeCardsByKey(filtered, this.sort);
        this.changeDetectorRef.markForCheck();
    }
}
