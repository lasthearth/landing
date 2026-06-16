import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон страницы деталей поселения.
 */
@Component({
    selector: 'app-settlement-detail-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div class="flex flex-col gap-6 w-full">
            <app-skeleton width="64" height="10" rounded="xl" />

            <div class="bg-lh-primary-2/10 border border-lh-primary-2/10 rounded-2xl p-6 flex flex-col gap-4">
                <div class="flex flex-col gap-3 flex-1">
                    <app-skeleton width="72" height="10" rounded="xl" />
                    <div class="flex flex-wrap gap-2">
                        <app-skeleton width="20" height="7" rounded="2xl" />
                        <app-skeleton width="24" height="7" rounded="2xl" />
                        <app-skeleton width="32" height="7" rounded="2xl" />
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <app-skeleton width="32" height="6" rounded="lg" />
                        <app-skeleton width="32" height="6" rounded="lg" />
                        <app-skeleton width="40" height="6" rounded="lg" />
                    </div>
                </div>

                <div class="flex xl:flex-row flex-col gap-6 items-start">
                    <div class="flex-1 flex flex-col gap-2 w-full">
                        <app-skeleton width="32" height="6" rounded="lg" />
                        <app-skeleton width="full" height="5" rounded="lg" />
                        <app-skeleton width="full" height="5" rounded="lg" />
                        <app-skeleton width="5/6" height="5" rounded="lg" />
                    </div>
                    <div
                        class="hidden xl:block w-full xl:max-w-[40%] aspect-video rounded-xl bg-lh-primary-2/30 animate-pulse"
                    ></div>
                </div>
            </div>

            <div class="bg-lh-primary-2/10 border border-lh-primary-2/10 rounded-2xl p-6 flex flex-col gap-4">
                <app-skeleton width="32" height="6" rounded="lg" />
                <div class="flex flex-wrap gap-3">
                    <app-skeleton width="24" height="8" rounded="2xl" />
                    <app-skeleton width="24" height="8" rounded="2xl" />
                    <app-skeleton width="24" height="8" rounded="2xl" />
                    <app-skeleton width="24" height="8" rounded="2xl" />
                </div>
            </div>

            <div class="flex w-full justify-between flex-wrap gap-3">
                <app-skeleton width="40" height="10" rounded="xl" />
                <app-skeleton width="40" height="10" rounded="xl" />
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementDetailSkeletonComponent {}
