import { ChangeDetectionStrategy, Component, inject, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiLoader } from '@taiga-ui/core';
import { IPendingPurchase } from '@entities/donate';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
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
    standalone: true,
    selector: 'app-pending-purchases-panel',
    imports: [AsyncPipe, TuiIcon, TuiLoader, ImageLoaderComponent],
    templateUrl: './pending-purchases-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPurchasesPanelComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogService: TuiDialogService = inject(TuiDialogService);

    /**
     * Поток со списком ожидающих покупок.
     */
    public readonly purchases$: InputSignal<Observable<IPendingPurchase[]>> =
        input.required<Observable<IPendingPurchase[]>>();

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
