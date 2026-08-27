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
        <div class="p-[0.3125rem] rounded-[0.875rem] bg-surface-3/60">
            <div
                class="flex xl:flex-row flex-col bg-lh-primary-2/10 relative rounded-[0.5625rem] h-full xl:max-h-[400px] overflow-hidden"
            >
                <div class="hidden xl:block xl:w-2/5 w-full shrink-0 h-full bg-lh-primary-2/30 animate-pulse"></div>

                <div class="xl:w-3/5 w-full p-5 flex flex-col gap-3 justify-between overflow-hidden">
                    <div class="flex flex-col gap-2.5">
                        <div class="flex flex-col gap-1.5">
                            <app-skeleton width="48" height="8" rounded="lg" />
                            <app-skeleton width="32" height="5" rounded="lg" />
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
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementCardSkeletonComponent {}
