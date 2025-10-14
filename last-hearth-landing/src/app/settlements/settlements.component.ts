import { Component, inject, OnInit } from '@angular/core';
import { SettlementService } from '../services/settlement.service';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { SettlementCardComponent } from './settlement-card/settlement-card.component';

@Component({
    selector: 'app-settlements',
    imports: [AsyncPipe, SettlementCardComponent],
    templateUrl: './settlements.component.html',
    styleUrls: ['./settlements.component.css']
})
export class SettlementsComponent {

    protected readonly settlements$ = inject(SettlementService).getSettlements();

}
