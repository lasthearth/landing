import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable } from 'rxjs';
import { SettlementFinderComponent } from './settlement-finder.component';

/**
 * Открывает «Подбери поселение».
 */
@Injectable({ providedIn: 'root' })
export class SettlementFinderService {
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Открывает диалог подбора.
     *
     * @returns Observable, завершающийся при закрытии.
     */
    public open(): Observable<void> {
        return this.dialogs.open<void>(new PolymorpheusComponent(SettlementFinderComponent), { size: 'auto' });
    }
}
