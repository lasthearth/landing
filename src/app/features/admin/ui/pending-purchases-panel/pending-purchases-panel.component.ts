import { ChangeDetectionStrategy, Component, inject, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { IPendingPurchase } from '@entities/donate';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { TranslatePipe } from '@core/i18n';
import { ErrorStateComponent } from '@shared/ui/error-state';
import {
    ConfirmPurchaseActionComponent,
    IConfirmPurchaseActionData,
} from '../../components/confirm-purchase-action/confirm-purchase-action.component';

/**
 * Компонент панели ожидающих выдачи покупок в админке.
 *
 * Отображает список покупок, которые необходимо выдать игрокам,
 * и позволяет отметить выдачу или оформить возврат.
 */
@Component({
    selector: 'app-pending-purchases-panel',
    standalone: true,
    imports: [TuiIcon, ImageLoaderComponent, EmptyStateComponent, ErrorStateComponent, TranslatePipe],
    templateUrl: './pending-purchases-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPurchasesPanelComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogService: TuiDialogService = inject(TuiDialogService);

    /**
     * Список ожидающих покупок.
     */
    public readonly purchases: InputSignal<IPendingPurchase[]> = input.required<IPendingPurchase[]>();

    /**
     * Признак загрузки списка.
     */
    public readonly loading: InputSignal<boolean> = input<boolean>(false);

    /**
     * Признак ошибки загрузки списка.
     */
    public readonly error: InputSignal<boolean> = input<boolean>(false);

    /**
     * Событие запроса на повторную загрузку.
     */
    public readonly retry = output<void>();

    /**
     * Событие изменения состояния списка покупок.
     */
    public readonly listChanged: OutputEmitterRef<void> = output();

    /**
     * Открывает диалог подтверждения выдачи покупки.
     *
     * @param purchase Покупка для выдачи.
     */
    protected issue(purchase: IPendingPurchase): void {
        this.openConfirmDialog(purchase, 'issue');
    }

    /**
     * Открывает диалог подтверждения возврата покупки.
     *
     * @param purchase Покупка для возврата.
     */
    protected refund(purchase: IPendingPurchase): void {
        this.openConfirmDialog(purchase, 'refund');
    }

    /**
     * Запрашивает повторную загрузку списка.
     */
    protected onRetry(): void {
        this.retry.emit();
    }

    /**
     * Открывает диалог подтверждения действия с покупкой.
     *
     * @param purchase Покупка.
     * @param action Тип действия.
     */
    private openConfirmDialog(purchase: IPendingPurchase, action: IConfirmPurchaseActionData['action']): void {
        this.dialogService
            .open(new PolymorpheusComponent(ConfirmPurchaseActionComponent), {
                size: 'auto',
                closeable: false,
                data: { purchaseId: purchase.id, action },
            })
            .subscribe({
                complete: () => {
                    this.listChanged.emit();
                },
            });
    }
}
