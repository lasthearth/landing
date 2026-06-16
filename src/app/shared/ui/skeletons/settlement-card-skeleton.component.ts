import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон карточки поселения из списка.
 */
@Component({
    selector: 'app-settlement-card-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div
            class="flex xl:flex-row flex-col bg-lh-primary-2/10 border border-lh-primary-2/10 relative rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] h-full max-h-[400px] overflow-hidden"
        >
            <div
                class="hidden xl:block xl:w-2/5 w-full shrink-0 h-full bg-lh-primary-2/30 animate-pulse rounded-t-2xl xl:rounded-l-2xl xl:rounded-tr-none"
            ></div>

            <div class="xl:w-3/5 w-full p-5 flex flex-col gap-3 justify-between overflow-hidden">
                <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <app-skeleton width="48" height="8" rounded="lg" />
                        <app-skeleton width="16" height="6" rounded="lg" />
                        <app-skeleton width="16" height="6" rounded="lg" />
                    </div>

                    <div class="flex gap-1.5 flex-wrap">
                        <app-skeleton width="20" height="6" rounded="lg" />
                        <app-skeleton width="24" height="6" rounded="lg" />
                        <app-skeleton width="28" height="6" rounded="lg" />
                    </div>

                    <div class="flex flex-col gap-1 mt-1">
                        <app-skeleton width="full" height="5" rounded="lg" />
                        <app-skeleton width="5/6" height="5" rounded="lg" />
                        <app-skeleton width="4/6" height="5" rounded="lg" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <div class="h-px bg-lh-primary-2/20 w-full rounded-full"></div>
                    <div class="flex flex-wrap gap-1.5">
                        <app-skeleton width="24" height="8" rounded="lg" />
                        <app-skeleton width="20" height="8" rounded="lg" />
                        <app-skeleton width="20" height="8" rounded="lg" />
                    </div>
                    <app-skeleton width="24" height="5" rounded="lg" className="self-end" />
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementCardSkeletonComponent {}
