import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TuiButton, TuiIcon, TuiDialogContext, TuiAlertService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DonateService } from '@entities/donate';
import { RequestStatusService } from '@core/services/request-status.service';

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
    imports: [TuiButton, TuiIcon],
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
     * Данные товара для отображения.
     */
    protected readonly data = this.context.data;

    /**
     * Выбранный срок подписки: месяц или навсегда.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>(this.data.initialTerm ?? 'month');

    /**
     * Возвращает актуальную цену в зависимости от выбранного срока.
     */
    protected get activePrice(): string {
        return this.selectedTerm() === 'season' && this.data.seasonPrice
            ? this.data.seasonPrice
            : (this.data.monthPrice ?? '');
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
            this.requestStatusService.showError('Не удалось определить товар для покупки.');
            return;
        }

        this.donateService
            .buyItem$(itemId)
            .pipe(
                this.requestStatusService.handleError('Не удалось оформить покупку.'),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.alertService
                        .open('', { label: 'Покупка успешно оформлена', appearance: 'positive' })
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
