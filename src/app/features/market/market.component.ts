import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TuiTabs } from '@taiga-ui/kit/components/tabs';
import { TitlesComponent } from './components/titles/titles.component';
import { KitsComponent } from './components/kits/kits.component';
import { SpecialComponent } from './components/special/special.component';
import { HowToBuyComponent } from './components/how-to-buy/how-to-buy.component';
import { TuiDialogService } from '@taiga-ui/core';

/**
 * Компонент магазина привилегий.
 */
@Component({
    selector: 'app-market',
    imports: [TuiTabs, TitlesComponent, KitsComponent, SpecialComponent],
    templateUrl: './market.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
    /**
     * Индекс открытой вкладки.
     */
    protected activeItemIndex: number = 0;

     private readonly dialogs = inject(TuiDialogService);

    protected howToBuy() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'l' }).subscribe();
    }
}
