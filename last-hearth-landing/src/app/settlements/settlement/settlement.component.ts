import { Component, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { CreateSettlementComponent } from '../create-settlement/create-settlement.component';
import { SettlementService } from '../../services/settlement.service';
import { AsyncPipe } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
    standalone: true,
    selector: 'app-settlement',
    imports: [AsyncPipe],
    templateUrl: './settlement.component.html',
    styleUrl: './settlement.component.css'
})
export class SettlementComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис данных о пользователе.
     */
    protected readonly userService: UserService = inject(UserService);

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    protected createSettlement(): void {
        this.dialogs.open(new PolymorpheusComponent(CreateSettlementComponent)).subscribe();
    }
}
