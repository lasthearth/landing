import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, signal } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { DonateService } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { mapShopItemToPrivilegeCard } from '../../lib/map-shop-item-to-privilege-card.function';
import { sortPrivilegeCardsByKey } from '../../lib/sort-privilege-cards-by-key.function';
import { MarketSortKey } from '../../lib/market-sort-key.type';
import { openPurchaseDialog } from '../purchase-dialog/open-purchase-dialog.function';
import { getRarityByPrice } from '../../lib/get-rarity-by-price.function';
import { createShopItemsLoader, ShopItemsLoader } from '../../lib/create-shop-items-loader.function';
import { selectShopItemsByCategory } from '../../lib/select-shop-items-by-category.function';
import { SHOP_CATEGORY_LABEL_KEY } from '../../lib/shop-category-label.constant';

/**
 * Компонент вкладки «Наборы» в магазине.
 *
 * Показывает доступные товары категории `kit` в виде списка с карточкой
 * выбранного набора и его составом. Пустой список — нормальное состояние
 * витрины, а не ошибка: записи появляются по мере захвата китов в игре.
 */
@Component({
    selector: 'app-kits',
    imports: [
        AmountPipe,
        KitItemComponent,
        TuiIcon,
        MarketGridSkeletonComponent,
        ImageLoaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        TranslatePipe,
    ],
    templateUrl: './kits.component.html',
    styleUrl: './kits.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitsComponent implements OnDestroy {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис явного обнаружения изменений.
     */
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    /**
     * Загрузчик товаров: держит признаки загрузки и сбоя, отбирает наборы.
     */
    private readonly loader: ShopItemsLoader = createShopItemsLoader(
        this.donateService,
        this.changeDetectorRef,
        (items) => {
            this.baseCards = selectShopItemsByCategory(items, 'kit').map(mapShopItemToPrivilegeCard);
            this.applySort();
        }
    );

    /**
     * Выбранный срок подписки.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>('month');

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = this.loader.loading;

    /**
     * Признак ошибки загрузки товаров.
     */
    protected readonly error = this.loader.error;

    /**
     * Все наборы категории до сортировки витрины.
     */
    private baseCards: PrivilegeCard[] = [];

    /**
     * Текущий ключ сортировки витрины.
     */
    private sort: MarketSortKey = 'price-asc';

    /**
     * Список наборов.
     */
    protected kits: PrivilegeCard[] = [];

    /**
     * Выбранный набор.
     */
    protected selectedPrivilege: PrivilegeCard | null = null;

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
     * Повторно загружает список наборов после ошибки.
     */
    protected retryLoad(): void {
        this.loader.retry();
    }

    /**
     * Возвращает ключ перевода подписи категории карточки.
     *
     * @param card Карточка товара.
     * @returns Ключ перевода подписи категории.
     */
    protected categoryLabelKey(card: PrivilegeCard): string {
        return SHOP_CATEGORY_LABEL_KEY[card.category];
    }

    /**
     * Выбирает набор из бокового списка.
     *
     * @param kit Выбранный набор.
     */
    protected selectKit(kit: PrivilegeCard): void {
        this.selectedPrivilege = kit;
    }

    /**
     * Вычисляет процент скидки.
     *
     * @param price Текущая цена.
     * @param originalPrice Оригинальная цена до скидки.
     * @returns Процент скидки или 0.
     */
    protected getDiscountPercent(price: string, originalPrice: string): number {
        if (!originalPrice || !price) {
            return 0;
        }
        const original = parseInt(originalPrice.replace(/\D/g, ''), 10);
        const current = parseInt(price.replace(/\D/g, ''), 10);
        if (!original || !current) {
            return 0;
        }
        return Math.round(((original - current) / original) * 100);
    }

    /**
     * Возвращает цену выбранного срока для кнопки покупки.
     *
     * @returns Цена строкой или пустая строка, если набор не выбран.
     */
    protected activePrice(): string {
        const kit = this.selectedPrivilege;
        if (!kit) {
            return '';
        }
        return this.selectedTerm() === 'season' && kit.seasonPrice ? kit.seasonPrice : kit.monthPrice;
    }

    /**
     * Возвращает абсолютную экономию в осколках для выбранного срока.
     *
     * @returns Экономия строкой или пустая строка, если скидки нет.
     */
    protected activeSavings(): string {
        const kit = this.selectedPrivilege;
        if (!kit) {
            return '';
        }
        const isSeason = this.selectedTerm() === 'season' && !!kit.seasonPrice;
        const original = parseInt((isSeason ? kit.seasonPriceOriginal : kit.monthPriceOriginal).replace(/\D/g, ''), 10);
        const current = parseInt((isSeason ? kit.seasonPrice : kit.monthPrice).replace(/\D/g, ''), 10);
        if (!original || !current || original <= current) {
            return '';
        }
        return String(original - current);
    }

    /**
     * Возвращает CSS-класс цвета рамки изображения по редкости товара.
     *
     * Редкость определяется ценой: обычный (пергамент), редкий (синий),
     * эпический (фиолетовый), легендарный (золотой). Рамка задаётся цветом
     * рамки, без свечения и тени в покое.
     *
     * @param price Цена товара строкой.
     * @returns Строка CSS-класса цвета рамки.
     */
    protected getRarityFrameClass(price: string): string {
        switch (getRarityByPrice(price)) {
            case 'legendary':
                return 'border-lh-accent';
            case 'epic':
                return 'border-rarity-epic';
            case 'rare':
                return 'border-rarity-rare';
            default:
                return 'border-line-strong';
        }
    }

    /**
     * Ключ сортировки витрины из панели магазина.
     */
    @Input()
    public set sortKey(value: MarketSortKey) {
        this.sort = value;
        this.applySort();
    }

    /**
     * Пересобирает список наборов по ключу сортировки и чинит выбор:
     * если выбранный набор не исчез из списка, выбор сохраняется.
     */
    private applySort(): void {
        this.kits = sortPrivilegeCardsByKey(this.baseCards, this.sort);
        const current = this.selectedPrivilege;
        this.selectedPrivilege = current && this.kits.includes(current) ? current : (this.kits[0] ?? null);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Открывает диалог покупки выбранного набора.
     */
    protected openPurchaseDialog(): void {
        if (this.selectedPrivilege) {
            openPurchaseDialog(this.dialogs, this.selectedPrivilege, this.selectedTerm());
        }
    }
}
