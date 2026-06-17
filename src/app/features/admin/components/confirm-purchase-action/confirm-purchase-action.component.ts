import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DonateService } from '@entities/donate';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';

/**
 * Данные, передаваемые в диалог подтверждения действия с покупкой.
 */
export interface IConfirmPurchaseActionData {
    /**
     * Идентификатор покупки.
     */
    purchaseId: string;

    /**
     * Тип действия: выдача или возврат.
     */
    action: 'issue' | 'refund';
}

/**
 * Компонент подтверждения действия с ожидающей выдачей покупкой.
 */
@Component({
    standalone: true,
    selector: 'app-confirm-purchase-action',
    templateUrl: './confirm-purchase-action.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TuiIcon, TranslatePipe],
})
export class ConfirmPurchaseActionComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, IConfirmPurchaseActionData> =
        inject<TuiDialogContext<void, IConfirmPurchaseActionData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService: DonateService = inject(DonateService);

    /**
     * Сервис статуса запросов.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Заголовок диалога в зависимости от действия.
     */
    protected readonly title =
        this.context.data.action === 'issue'
            ? this.i18n.translate('admin.purchases.confirmIssueTitle')
            : this.i18n.translate('admin.purchases.confirmRefundTitle');

    /**
     * Текст кнопки подтверждения в зависимости от действия.
     */
    protected readonly confirmText =
        this.context.data.action === 'issue'
            ? this.i18n.translate('admin.purchases.confirmIssueAction')
            : this.i18n.translate('admin.purchases.confirmRefundAction');

    /**
     * Иконка диалога в зависимости от действия.
     */
    protected readonly icon = this.context.data.action === 'issue' ? '@tui.check' : '@tui.rotate-ccw';

    /**
     * Цвет иконки в зависимости от действия.
     */
    protected readonly iconColor = this.context.data.action === 'issue' ? 'text-lh-accent' : 'text-lh-danger';

    /**
     * Цвет фона иконки в зависимости от действия.
     */
    protected readonly iconBg = this.context.data.action === 'issue' ? 'bg-lh-accent/10' : 'bg-lh-danger/10';

    /**
     * Цвет границы иконки в зависимости от действия.
     */
    protected readonly iconBorder = this.context.data.action === 'issue' ? 'border-lh-accent/20' : 'border-lh-danger/20';

    /**
     * Подтверждает действие с покупкой.
     */
    protected confirmAction(): void {
        const request$ =
            this.context.data.action === 'issue'
                ? this.donateService.markPurchaseIssued$(this.context.data.purchaseId)
                : this.donateService.refundPurchase$(this.context.data.purchaseId);

        const successMessage =
            this.context.data.action === 'issue'
                ? this.i18n.translate('admin.purchases.issuedSuccess')
                : this.i18n.translate('admin.purchases.refundedSuccess');

        request$
            .pipe(
                this.requestStatusService.handleError(),
                this.requestStatusService.handleSuccess(successMessage, this.context.$implicit),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
