import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TuiButton, TuiIcon, TuiDialogContext, TuiAlertService, TuiDialogService } from '@taiga-ui/core';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { AbilityTagComponent } from '@shared/ui/ability-tag/ability-tag.component';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DonateService } from '@entities/donate';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { HowToBuyComponent } from '../how-to-buy/how-to-buy.component';

/**
 * Данные для диалога покупки товара.
 */
export interface PurchaseDialogData {
    /**
     * Идентификатор товара магазина.
     */
    itemId?: string;

    /**
     * Название товара.
     */
    title: string;

    /**
     * URL изображения товара.
     */
    image: string;

    /**
     * Цена товара за месяц.
     */
    monthPrice?: string;

    /**
     * Цена товара навсегда (за сезон).
     */
    seasonPrice?: string;

    /**
     * Изначально выбранный срок при открытии диалога.
     */
    initialTerm?: 'month' | 'season';

    /**
     * Валюта цены: коины или рубли.
     */
    currency: 'coins' | 'rubles';

    /**
     * Описание товара (для динамических товаров магазина).
     */
    description?: string;

    /**
     * Список игровых предметов в комплекте (для титулов/наборов).
     */
    kitItems?: Array<{ hint: string; count: number; image?: string }>;

    /**
     * Список ежедневных предметов (для титулов).
     */
    dailyKitItems?: Array<{ hint: string; count: number; image?: string }>;

    /**
     * Список способностей/бонусов (для титулов).
     */
    privileges?: Array<{ icon: string; text: string }>;
}

/**
 * Диалог подтверждения покупки товара.
 *
 * Отображает информацию о товаре, его содержимое
 * и кнопки подтверждения/отмены.
 */
@Component({
    selector: 'app-purchase-dialog',
    standalone: true,
    imports: [TuiButton, TuiIcon, ImageLoaderComponent, AbilityTagComponent, KitItemComponent, TranslatePipe],
    templateUrl: './purchase-dialog.component.html',
    styleUrl: './purchase-dialog.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDialogComponent {
    /**
     * Контекст диалога Taiga UI.
     */
    protected readonly context = inject<TuiDialogContext<void, PurchaseDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис статуса запросов.
     */
    private readonly requestStatusService = inject(RequestStatusService);

    /**
     * Сервис уведомлений.
     */
    private readonly alertService = inject(TuiAlertService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис диалогов — для перехода к пополнению баланса.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Данные товара для отображения.
     */
    protected readonly data = this.context.data;

    /**
     * Выбранный срок подписки: месяц или навсегда.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>(this.data.initialTerm ?? 'month');

    /**
     * Текущий баланс осколков игрока.
     *
     * `null`, если баланс недоступен (неавторизован или ошибка запроса).
     */
    protected readonly balance = signal<string | null>(null);

    constructor() {
        this.donateService
            .getMyBalance$()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((response) => this.balance.set(response?.coins ?? null));
    }

    /**
     * Возвращает актуальную цену в зависимости от выбранного срока.
     */
    protected get activePrice(): string {
        return this.selectedTerm() === 'season' && this.data.seasonPrice
            ? this.data.seasonPrice
            : (this.data.monthPrice ?? '');
    }

    /**
     * Возвращает нехватку осколков для покупки.
     *
     * @returns Количество недостающих осколков, 0 если средств достаточно
     * либо баланс неизвестен.
     */
    protected missingAmount(): number {
        const balance = this.balance();
        if (balance === null) {
            return 0;
        }
        const available = parseInt(balance.replace(/\D/g, ''), 10) || 0;
        const price = parseInt(this.activePrice.replace(/\D/g, ''), 10) || 0;
        return Math.max(0, price - available);
    }

    /**
     * Закрывает диалог покупки и открывает диалог пополнения осколков.
     */
    protected onTopUp(): void {
        this.context.completeWith();
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Обрабатывает нажатие кнопки «Купить».
     *
     * Отправляет запрос покупки товара на бэкенд.
     * При успехе показывает уведомление и закрывает диалог.
     */
    protected onBuy(): void {
        const itemId = this.data.itemId;
        if (!itemId) {
            this.requestStatusService.showError(this.i18n.translate('market.purchaseDialog.unknownItemError'));
            return;
        }

        this.donateService
            .buyItem$(itemId)
            .pipe(
                this.requestStatusService.handleError(this.i18n.translate('market.purchaseDialog.purchaseError')),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.alertService
                        .open('', {
                            label: this.i18n.translate('market.purchaseDialog.successMessage'),
                            appearance: 'positive',
                        })
                        .subscribe();
                    this.context.completeWith();
                },
            });
    }

    /**
     * Закрывает диалог без покупки.
     */
    protected onCancel(): void {
        this.context.completeWith();
    }
}
