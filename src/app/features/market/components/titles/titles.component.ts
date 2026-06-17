import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { catchError, of } from 'rxjs';
import { DonateService, IShopItem } from '@entities/donate';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { AbilityTagComponent } from '@shared/ui/ability-tag/ability-tag.component';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';
import { mapShopItemToPrivilegeCard } from '../../lib/map-shop-item-to-privilege-card.function';

/**
 * Компонент вкладки «Привилегии» в магазине.
 *
 * Загружает реальные товары типа ITEM_TYPE_KIT с описанием "привилегия"
 * (и устаревшие ITEM_TYPE_ITEM с составом) и отображает их в виде selectable карточек с деталями.
 */
@Component({
    selector: 'app-titles',
    imports: [AbilityTagComponent, KitItemComponent, TuiIcon, MarketGridSkeletonComponent, ImageLoaderComponent],
    templateUrl: './titles.component.html',
    styleUrl: './titles.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitlesComponent {
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
     * Список привилегий.
     */
    protected titles: PrivilegeCard[] = [];

    /**
     * Выбранная привилегия.
     */
    protected selectedPrivilege: PrivilegeCard | null = null;

    constructor() {
        this.donateService
            .getShopItems$()
            .pipe(
                catchError(() => {
                    this.loading.set(false);
                    return of([]);
                })
            )
            .subscribe((items) => {
                this.titles = this.filterAndMapPrivileges(items);
                this.selectedPrivilege = this.titles[0] ?? null;
                this.loading.set(false);
                this.changeDetectorRef.markForCheck();
            });
    }

    /**
     * Фильтрует товары-привилегии и преобразует их в модель карточки.
     *
     * @param items Список товаров магазина.
     * @returns Список карточек привилегий.
     */
    private filterAndMapPrivileges(items: IShopItem[]): PrivilegeCard[] {
        return items
            .filter(
                (item) =>
                    item.isAvailable &&
                    ((item.itemType === 'ITEM_TYPE_KIT' && item.description === 'привилегия') ||
                        (item.itemType === 'ITEM_TYPE_ITEM' && (item.entries?.length ?? 0) > 0))
            )
            .map(mapShopItemToPrivilegeCard);
    }

    /**
     * Выбирает привилегию из бокового списка.
     *
     * @param privilege Выбранная привилегия.
     */
    protected selectPrivilege(privilege: PrivilegeCard): void {
        this.selectedPrivilege = privilege;
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
