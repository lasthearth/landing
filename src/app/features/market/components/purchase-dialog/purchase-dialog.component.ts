import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';

/**
 * Данные для диалога покупки товара.
 */
export interface PurchaseDialogData {
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
    abilities?: Array<{ icon: string; text: string }>;
}

/**
 * Диалог подтверждения покупки товара.
 *
 * Отображает информацию о товаре, его содержимое,
 * поле для комментария и кнопки подтверждения/отмены.
 */
@Component({
    selector: 'app-purchase-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, TuiButton, TuiIcon, KitItemComponent, LHInputComponent],
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
     * Данные товара для отображения.
     */
    protected readonly data = this.context.data;

    /**
     * Выбранный срок подписки: месяц или навсегда.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>(this.data.initialTerm ?? 'month');

    /**
     * Комментарий пользователя к заказу.
     */
    protected comment = '';

    /**
     * Возвращает актуальную цену в зависимости от выбранного срока.
     */
    protected get activePrice(): string {
        return this.selectedTerm() === 'season' && this.data.seasonPrice
            ? this.data.seasonPrice
            : this.data.monthPrice ?? '';
    }

    /**
     * Обрабатывает нажатие кнопки «Купить».
     *
     * ⚠️ Заглушка: реальное списание и покупка будут реализованы
     * после появления batch-эндпоинта на бэкенде.
     */
    protected onBuy(): void {
        // eslint-disable-next-line no-console
        console.debug('[PurchaseDialog] Покупка:', this.data.title, 'Комментарий:', this.comment);
        this.context.completeWith();
    }

    /**
     * Закрывает диалог без покупки.
     */
    protected onCancel(): void {
        this.context.completeWith();
    }
}
