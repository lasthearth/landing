import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiIcon, TuiLoader, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { catchError, of } from 'rxjs';
import { DonateService, IShopItem } from '@entities/donate';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';

/**
 * Компонент вкладки "Особое" в магазине.
 *
 * Отображает динамический список товаров из API магазина в виде сетки карточек.
 */
@Component({
    selector: 'app-special',
    imports: [CommonModule, TuiButton, TuiIcon, TuiLoader, PurchaseDialogComponent],
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
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Список товаров магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

    constructor() {
        this.donateService
            .getShopItems$()
            .pipe(
                catchError(() => {
                    this.loading.set(false);
                    return of([]);
                })
            )
            .subscribe((list) => {
                this.items.set(list.filter((item) => item.isAvailable));
                this.loading.set(false);
            });
    }

    /**
     * Открывает диалог покупки товара.
     *
     * @param item Товар для покупки.
     */
    protected openPurchaseDialog(item: IShopItem): void {
        const data: PurchaseDialogData = {
            title: item.name,
            image: item.imageUrl,
            monthPrice: item.price,
            currency: 'coins',
            description: item.description,
        };
        this.dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();
    }
}
