import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { catchError, of } from 'rxjs';
import { DonateService, IShopItem } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';
import { mapShopItemToPrivilegeCard } from '../../lib/map-shop-item-to-privilege-card.function';

/**
 * Компонент вкладки «Наборы» в магазине.
 *
 * Загружает реальные товары типа ITEM_TYPE_KIT, кроме помеченных
 * описанием "привилегия", и отображает их состав в виде selectable карточек.
 */
@Component({
    selector: 'app-kits',
    imports: [KitItemComponent, TuiIcon, MarketGridSkeletonComponent, ImageLoaderComponent, EmptyStateComponent, ErrorStateComponent],
    templateUrl: './kits.component.html',
    styleUrl: './kits.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitsComponent {
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
     * Выбранный срок подписки.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>('month');

    /**
     * Признак загрузки товаров.
     */
    protected readonly loading = signal(true);

    /**
     * Признак ошибки загрузки товаров.
     */
    protected readonly error = signal(false);

    /**
     * Список наборов.
     */
    protected kits: PrivilegeCard[] = [];

    /**
     * Выбранный набор.
     */
    protected selectedPrivilege: PrivilegeCard | null = null;

    constructor() {
        this.loadKits();
    }

    /**
     * Загружает список наборов.
     */
    private loadKits(): void {
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
            .subscribe((items) => {
                this.kits = this.filterAndMapKits(items);
                this.selectedPrivilege = this.kits[0] ?? null;
                this.loading.set(false);
                this.changeDetectorRef.markForCheck();
            });
    }

    /**
     * Повторно загружает список наборов после ошибки.
     */
    protected retryLoad(): void {
        this.loadKits();
    }

    /**
     * Фильтрует наборы и преобразует их в модель карточки.
     *
     * @param items Список товаров магазина.
     * @returns Список карточек наборов.
     */
    private filterAndMapKits(items: IShopItem[]): PrivilegeCard[] {
        return items
            .filter(
                (item) =>
                    item.isAvailable &&
                    item.itemType === 'ITEM_TYPE_KIT' &&
                    item.description !== 'привилегия'
            )
            .map(mapShopItemToPrivilegeCard);
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
     * Открывает диалог покупки выбранного набора.
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
        };

        this.dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();
    }
}
