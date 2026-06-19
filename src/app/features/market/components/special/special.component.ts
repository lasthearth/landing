import { ChangeDetectionStrategy, Component, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { TuiButton, TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import { TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent, PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';
import { DonateService, IShopItem } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { TranslatePipe } from '@core/i18n';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';

/**
 * Компонент вкладки "Особое" в магазине.
 *
 * Отображает динамический список обычных предметов магазина
 * (ITEM_TYPE_ITEM без состава) в виде сетки карточек.
 */
@Component({
    selector: 'app-special',
    imports: [
        TuiIcon,
        TuiButton,
        TuiPreview,
        PolymorpheusOutlet,
        MarketGridSkeletonComponent,
        ImageLoaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        TranslatePipe,
    ],
    templateUrl: './special.component.html',
    styleUrl: './special.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialComponent {
    /**
     * Сервис донат-валюты.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис предпросмотра изображений.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = signal(true);

    /**
     * Признак ошибки загрузки товаров.
     */
    protected readonly error = signal(false);

    /**
     * Список товаров магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

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
        this.loadItems();
    }

    /**
     * Загружает список особых товаров.
     */
    private loadItems(): void {
        this.loading.set(true);
        this.error.set(false);
        this.donateService
            .getShopItems$()
            .pipe(
                catchError(() => {
                    this.loading.set(false);
                    this.error.set(true);
                    return of([]);
                })
            )
            .subscribe((list) => {
                this.items.set(this.filterSpecialItems(list));
                this.loading.set(false);
            });
    }

    /**
     * Повторно загружает список особых товаров после ошибки.
     */
    protected retryLoad(): void {
        this.loadItems();
    }

    /**
     * Оставляет только доступные обычные предметы без состава набора.
     *
     * @param list Список товаров магазина.
     * @returns Отфильтрованный список предметов.
     */
    private filterSpecialItems(list: IShopItem[]): IShopItem[] {
        return list.filter(
            (item) =>
                item.isAvailable &&
                item.itemType === 'ITEM_TYPE_ITEM' &&
                (!item.entries || item.entries.length === 0)
        );
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
