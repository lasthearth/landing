import { Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { ISettlement } from '../interfaces/i-settlement';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
    selector: 'app-settlement-detailed',
    templateUrl: './settlement-detailed.component.html',
})
export class SettlementDetailedComponent {

    /**
     * Контекст открытого диалогового окна.
     */
    private readonly context: TuiDialogContext<void, { settlement: ISettlement }> =
        inject<TuiDialogContext<void, { settlement: ISettlement }>>(POLYMORPHEUS_CONTEXT);

    settlementData = this.context.data.settlement
}
