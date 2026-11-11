import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    inject,
    OnDestroy,
    signal,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import { TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent, PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { DonateService, IKitEntry, IShopItem, IShopSection, SHOP_SECTIONS } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';
import { createShopItemsLoader, ShopItemsLoader } from '../../lib/create-shop-items-loader.function';
import { selectShopItemsByCategory } from '../../lib/select-shop-items-by-category.function';
import { sortShopItemsByPrice } from '../../lib/sort-privilege-cards-by-price.function';
import { SHOP_CATEGORY_LABEL_KEY } from '../../lib/shop-category-label.constant';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { KitItem } from '../../interfaces/kit-item.interface';

/**
 * Компонент вкладки "Особое" в магазине.
 *
 * Показывает доступные товары категории `special` сеткой карточек.
 * Пустой список — нормальное состояние витрины, а не ошибка:
 * записи появляются по мере захвата китов в игре.
 */
@Component({
    selector: 'app-special',
    imports: [AmountPipe,
        TuiIcon,
        TuiPreview,
        PolymorpheusOutlet,
        MarketGridSkeletonComponent,
        ImageLoaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        KitItemComponent,
        TranslatePipe,
    ],
    templateUrl: './special.component.html',
    styleUrl: './special.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialComponent implements OnDestroy {
    /**
     * Сервис донат-валюты.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис явного обнаружения изменений.
     */
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    /**
     * Сервис предпросмотра изображений.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Загрузчик товаров: держит признаки загрузки и сбоя, отбирает особые товары.
     */
    private readonly loader: ShopItemsLoader = createShopItemsLoader(
        this.donateService,
        this.changeDetectorRef,
        (list) => this.items.set(sortShopItemsByPrice(selectShopItemsByCategory(list, 'special')))
    );

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = this.loader.loading;

    /**
     * Признак ошибки загрузки товаров.
     */
    protected readonly error = this.loader.error;

    /**
     * Список товаров магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

    /**
     * Выбранный раздел витрины, пустая строка — «Все».
     */
    protected readonly selectedSection = signal<string>('');

    /**
     * Разделы витрины в порядке `SHOP_SECTIONS`: вкладки видны всегда,
     * пустой раздел показывает заглушку.
     */
    protected readonly sections: readonly IShopSection[] = SHOP_SECTIONS;

    /**
     * Число товаров в каждом разделе, по ключу раздела.
     */
    protected readonly sectionCounts = computed<Map<string, number>>(() => {
        const counts = new Map<string, number>();
        this.items().forEach((item) => counts.set(item.section, (counts.get(item.section) ?? 0) + 1));
        return counts;
    });

    /**
     * Товары выбранного раздела, для «Все» — все товары.
     */
    protected readonly visibleItems = computed<IShopItem[]>(() => {
        const key = this.selectedSection();
        return key ? this.items().filter((item) => item.section === key) : this.items();
    });

    /**
     * Признак активной вкладки раздела.
     *
     * @param key Ключ раздела, пустая строка — «Все».
     * @returns `true`, если вкладка выбрана.
     */
    protected isSectionActive(key: string): boolean {
        return this.selectedSection() === key;
    }

    /**
     * Описание изображения, открытого в предпросмотре.
     */
    protected previewDesc: string | null = null;

    /**
     * Ссылка на шаблон окна предпросмотра.
     */
    @ViewChild('preview')
    protected readonly preview?: TemplateRef<TuiDialogContext>;

    /**
     * Содержимое предпросмотра (URL изображения).
     */
    protected previewContent: PolymorpheusContent;

    constructor() {
        this.loader.load();
    }

    /**
     * Снимает подписку на поток товаров.
     */
    public ngOnDestroy(): void {
        this.loader.destroy();
    }

    /**
     * Повторно загружает список особых товаров после ошибки.
     */
    protected retryLoad(): void {
        this.loader.retry();
    }

    /**
     * Возвращает ключ перевода подписи категории товара.
     *
     * @param item Товар магазина.
     * @returns Ключ перевода подписи категории.
     */
    protected categoryLabelKey(item: IShopItem): string {
        return SHOP_CATEGORY_LABEL_KEY[item.category];
    }

    /**
     * Переводит позицию состава в модель ячейки предмета.
     *
     * @param entry Позиция состава товара.
     * @returns Данные для компонента ячейки с количеством.
     */
    protected toKitItem(entry: IKitEntry): KitItem {
        return {
            hint: entry.name,
            description: entry.description,
            count: entry.quantity,
            image: entry.imageUrl,
        };
    }

    /**
     * Проверяет, действует ли на товар скидка.
     *
     * @param item Товар магазина.
     * @returns true, если у товара есть скидка.
     */
    protected hasDiscount(item: IShopItem): boolean {
        return (
            item.hasDiscount === true &&
            !!item.effectivePrice &&
            item.effectivePrice !== item.price
        );
    }

    /**
     * Возвращает актуальную цену товара с учётом скидки.
     *
     * @param item Товар магазина.
     * @returns Цена для отображения.
     */
    protected getDisplayPrice(item: IShopItem): string {
        return item.effectivePrice && item.effectivePrice !== item.price ? item.effectivePrice : item.price;
    }

    /**
     * Вычисляет процент скидки товара.
     *
     * @param item Товар магазина.
     * @returns Процент скидки или 0.
     */
    protected getDiscountPercent(item: IShopItem): number {
        if (item.discountPercent != null && item.discountPercent > 0) {
            return item.discountPercent;
        }

        if (!this.hasDiscount(item)) {
            return 0;
        }

        const original = parseInt(item.price.replace(/\D/g, ''), 10);
        const current = parseInt(item.effectivePrice!.replace(/\D/g, ''), 10);

        if (!original || !current) {
            return 0;
        }

        return Math.round(((original - current) / original) * 100);
    }

    /**
     * Возвращает абсолютную экономию в осколках по товару.
     *
     * @param item Товар магазина.
     * @returns Экономия строкой или пустая строка, если скидки нет.
     */
    protected getSavings(item: IShopItem): string {
        if (!this.hasDiscount(item)) {
            return '';
        }

        const original = parseInt(item.price.replace(/\D/g, ''), 10);
        const current = parseInt(item.effectivePrice!.replace(/\D/g, ''), 10);

        if (!original || !current || original <= current) {
            return '';
        }

        return String(original - current);
    }

    /**
     * Открывает диалог покупки товара.
     *
     * @param item Товар для покупки.
     */
    protected openPurchaseDialog(item: IShopItem): void {
        const data: PurchaseDialogData = {
            itemId: item.id,
            title: item.name,
            image: item.imageUrl,
            monthPrice: this.getDisplayPrice(item),
            currency: 'coins',
            description: item.description,
        };
        this.dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();
    }

    /**
     * Открывает изображение товара в окне предпросмотра.
     *
     * @param url Ссылка на изображение.
     * @param desc Ключ перевода для описания изображения.
     */
    protected show(url: string, desc: string): void {
        this.previewContent = url;
        this.previewDesc = desc;
        this.previewService.open(this.preview || '').subscribe();
    }
}
