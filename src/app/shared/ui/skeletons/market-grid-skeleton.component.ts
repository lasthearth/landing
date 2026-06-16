import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MarketCardSkeletonComponent } from './market-card-skeleton.component';

/**
 * Скелетон сетки товаров магазина.
 */
@Component({
    selector: 'app-market-grid-skeleton',
    standalone: true,
    imports: [MarketCardSkeletonComponent],
    template: `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            @for (_ of itemsArray(); track $index) {
                <app-market-card-skeleton />
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketGridSkeletonComponent {
    /**
     * Количество карточек-заглушек.
     */
    public readonly count = input<number>(10);

    protected readonly itemsArray = computed(() => Array.from({ length: this.count() }));
}
