import { Component, inject, input, InputSignal, OnInit } from '@angular/core';
import { ISettlement } from '../interfaces/i-settlement';
import { SettlementService } from '../../services/settlement.service';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-settlement-card',
    templateUrl: './settlement-card.component.html',
    styleUrls: ['./settlement-card.component.css'],
    imports: [CommonModule],
})
export class SettlementCardComponent {
    /**
     * Данные поселения.
     */
    public data: InputSignal<ISettlement> = input.required();

    public isControlCard: InputSignal<boolean> = input(false);

    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    protected getSettlementTypeByKey(key: string | undefined) {
        switch (key) {
            case 'CAMP':
            default:
                return 'Лагерь';
        }
    }
}
