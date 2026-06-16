import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { TitlesComponent } from './components/titles/titles.component';
import { KitsComponent } from './components/kits/kits.component';
import { SpecialComponent } from './components/special/special.component';
import { HowToBuyComponent } from './components/how-to-buy/how-to-buy.component';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';

/**
 * Компонент магазина привилегий.
 */
@Component({
    selector: 'app-market',
    imports: [TitlesComponent, KitsComponent, SpecialComponent, TuiIcon],
    templateUrl: './market.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex = signal(0);

     private readonly dialogs = inject(TuiDialogService);

    protected howToBuy() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }
}
