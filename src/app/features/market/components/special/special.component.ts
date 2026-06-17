import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TuiIcon, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
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
    imports: [TuiIcon, MarketGridSkeletonComponent, ImageLoaderComponent, EmptyStateComponent, ErrorStateComponent, TranslatePipe],
    templateUrl: './special.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialComponent {
    /**
     * Сервис донат-валюты.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = signal(true);

    /**
     * Признак ошибки загрузки товаров.
     */
    protected readonly error = signal(false);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Список товаров магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

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
     * Возвращает актуальную цену товара с учётом скидки.
     *
     * @param item Товар магазина.
     * @returns Цена для отображения.
     */
    protected getDisplayPrice(item: IShopItem): string {
        return item.effectivePrice && item.effectivePrice !== item.price ? item.effectivePrice : item.price;
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
}
