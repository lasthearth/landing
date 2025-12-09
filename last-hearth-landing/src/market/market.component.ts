import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TuiTabs } from '@taiga-ui/kit/components/tabs';
import { TitlesComponent } from './components/titles/titles.component';
import { KitsComponent } from './components/kits/kits.component';
import { SpecialComponent } from './components/special/special.component';

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
}
