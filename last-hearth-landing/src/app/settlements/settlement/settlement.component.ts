import { Component, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { CreateSettlementComponent } from '../create-settlement/create-settlement.component';

@Component({
    standalone: true,
    selector: 'app-settlement',
    templateUrl: './settlement.component.html',
    styleUrl: './settlement.component.css'
})
export class SettlementComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    protected createSettlement(): void {
        this.dialogs.open(new PolymorpheusComponent(CreateSettlementComponent)).subscribe();
    }

}
