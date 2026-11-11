import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, NgZone, OnDestroy, signal } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { DonateService } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { AbilityTagComponent } from '@shared/ui/ability-tag/ability-tag.component';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';
import { mapShopItemToPrivilegeCard } from '../../lib/map-shop-item-to-privilege-card.function';
import { sortPrivilegeCardsByPrice } from '../../lib/sort-privilege-cards-by-price.function';
import { getRarityByPrice } from '../../lib/get-rarity-by-price.function';
import { createShopItemsLoader, ShopItemsLoader } from '../../lib/create-shop-items-loader.function';
import { crossfadeUpdate } from '../../lib/crossfade-transition.function';
import { selectShopItemsByCategory } from '../../lib/select-shop-items-by-category.function';
import { SHOP_CATEGORY_LABEL_KEY } from '../../lib/shop-category-label.constant';

/**
 * Компонент вкладки «Привилегии» в магазине.
 *
 * Показывает доступные товары категории `privilege` в виде списка
 * с карточкой выбранной привилегии. Пустой список — нормальное состояние
 * витрины, а не ошибка: записи появляются по мере захвата китов в игре.
 */
@Component({
    selector: 'app-titles',
    imports: [
        AmountPipe,
        AbilityTagComponent,
        KitItemComponent,
        TuiIcon,
        MarketGridSkeletonComponent,
        ImageLoaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        TranslatePipe,
    ],
    templateUrl: './titles.component.html',
    styleUrl: './titles.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitlesComponent implements OnDestroy {
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
     * Загрузчик товаров: держит признаки загрузки и сбоя, отбирает привилегии.
     */
    private readonly loader: ShopItemsLoader = createShopItemsLoader(
        this.donateService,
        this.changeDetectorRef,
        (items) => {
            this.titles = sortPrivilegeCardsByPrice(
                selectShopItemsByCategory(items, 'privilege').map(mapShopItemToPrivilegeCard)
            );
            this.selectedPrivilege = this.titles[0] ?? null;
            this.warmImages();
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
     * Список привилегий.
     */
    protected titles: PrivilegeCard[] = [];

    /**
     * Выбранная привилегия.
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
     * Повторно загружает список привилегий после ошибки.
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
     * Зона Angular: колбэк view transition выполняется браузером вне зоны.
     */
    private readonly zone = inject(NgZone);

    /**
     * Выбирает привилегию с морфингом элементов карточки: view transition
     * перетекает старые картинку, заголовок, цены, способности и составы
     * в новые, панель целиком не мигает.
     *
     * @param privilege Выбранная привилегия.
     */
    protected selectPrivilege(privilege: PrivilegeCard): void {
        if (privilege === this.selectedPrivilege) {
            return;
        }

        crossfadeUpdate(this.zone, () => {
            this.selectedPrivilege = privilege;
            this.changeDetectorRef.detectChanges();
        });
    }

    /**
     * Переключает срок подписки с морфингом блока цен.
     *
     * @param term Выбранный срок.
     */
    protected selectTerm(term: 'month' | 'season'): void {
        if (this.selectedTerm() === term) {
            return;
        }

        crossfadeUpdate(this.zone, () => {
            this.selectedTerm.set(term);
            this.changeDetectorRef.detectChanges();
        });
    }

    /**
     * Прогревает картинки всех привилегий в простое браузера: смена выбора
     * внутри view transition морфит уже декодированные картинки, а не
     * пустые кадры загрузки.
     */
    private warmImages(): void {
        if (typeof requestIdleCallback === 'undefined') {
            return;
        }

        requestIdleCallback(
            () => {
                for (const title of this.titles) {
                    const image = new Image();
                    image.src = title.image;
                    void image.decode().catch(() => undefined);
                }
            },
            { timeout: 4000 },
        );
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
     * @returns Цена строкой или пустая строка, если привилегия не выбрана.
     */
    protected activePrice(): string {
        const privilege = this.selectedPrivilege;
        if (!privilege) {
            return '';
        }
        return this.selectedTerm() === 'season' && privilege.seasonPrice ? privilege.seasonPrice : privilege.monthPrice;
    }

    /**
     * Возвращает абсолютную экономию в осколках для выбранного срока.
     *
     * @returns Экономия строкой или пустая строка, если скидки нет.
     */
    protected activeSavings(): string {
        const privilege = this.selectedPrivilege;
        if (!privilege) {
            return '';
        }
        const isSeason = this.selectedTerm() === 'season' && !!privilege.seasonPrice;
        const original = parseInt(
            (isSeason ? privilege.seasonPriceOriginal : privilege.monthPriceOriginal).replace(/\D/g, ''),
            10
        );
        const current = parseInt((isSeason ? privilege.seasonPrice : privilege.monthPrice).replace(/\D/g, ''), 10);
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
     * Открывает диалог покупки выбранной привилегии.
     */
    protected openPurchaseDialog(): void {
        const p = this.selectedPrivilege;
        if (!p || !p.id) {
            return;
        }

        const term = this.selectedTerm();
        const data: PurchaseDialogData = {
            itemId: p.id,
            title: p.title,
            image: p.image,
            monthPrice: p.monthPrice,
            seasonPrice: p.seasonPrice,
            currency: p.currency ?? 'coins',
            initialTerm: term,
            description: p.description,
            kitItems: p.kitItems,
            dailyKitItems: p.dailyKitItems,
            privileges: p.privileges,
        };

        this.dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();
    }
}
