import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { SettlementService } from '../services/settlement.service';
import { AsyncPipe } from '@angular/common';
import { catchError, map, of } from 'rxjs';
import { SettlementCardComponent } from './settlement-card/settlement-card.component';
import { TuiLoader } from '@taiga-ui/core';

@Component({
    selector: 'app-settlements',
    imports: [AsyncPipe, SettlementCardComponent, TuiLoader],
    templateUrl: './settlements.component.html',
    styleUrl: './settlements.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementsComponent {
    protected readonly settlements$ = inject(SettlementService)
        .getSettlements()
        .pipe(
            map((s) => {
                if (s === null) return undefined;

                return s;
            }),
            catchError(() => {
                return of(undefined);
            })
        );
}
