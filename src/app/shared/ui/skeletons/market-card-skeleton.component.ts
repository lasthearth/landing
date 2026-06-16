import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон карточки товара магазина.
 */
@Component({
    selector: 'app-market-card-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div
            class="flex flex-col gap-3 bg-lh-primary-2/10 border border-lh-primary-2/10 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        >
            <div class="w-full aspect-square rounded-xl bg-lh-primary-2/30 animate-pulse"></div>
            <app-skeleton width="full" height="6" rounded="xl" />
            <app-skeleton width="24" height="6" rounded="xl" className="self-center" />
            <app-skeleton width="full" height="10" rounded="xl" />
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketCardSkeletonComponent {}
