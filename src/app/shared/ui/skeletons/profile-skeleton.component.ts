import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон шапки профиля.
 */
@Component({
    selector: 'app-profile-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div class="text-lh-primary flex flex-col gap-2 p-6">
            <div class="grid gap-4 grid-cols-[1fr_auto_auto] max-[1710px]:grid-cols-1">
                <div class="flex gap-4 max-[640px]:flex-col">
                    <div class="flex flex-col shrink-0 overflow-hidden rounded-2xl max-[640px]:hidden">
                        <div
                            class="w-full max-h-44 max-w-40 aspect-[10/12] bg-lh-primary-2/30 animate-pulse rounded-t-2xl"
                        ></div>
                        <app-skeleton width="40" height="10" rounded="none" />
                    </div>

                    <div class="flex flex-col justify-between gap-3 min-w-0 flex-1">
                        <div class="flex items-stretch gap-3 max-[530px]:flex-col">
                            <div
                                class="flex-1 flex flex-col justify-center bg-lh-primary-2/10 rounded-xl px-3 py-2 border border-lh-primary-2/10 gap-1"
                            >
                                <app-skeleton width="16" height="5" rounded="lg" />
                                <app-skeleton width="32" height="7" rounded="lg" />
                            </div>
                            <div
                                class="flex-1 flex flex-col justify-center bg-lh-primary-2/10 rounded-xl px-3 py-2 border border-lh-primary-2/10 gap-1"
                            >
                                <app-skeleton width="20" height="5" rounded="lg" />
                                <app-skeleton width="36" height="7" rounded="lg" />
                            </div>
                        </div>

                        <div
                            class="flex-1 flex flex-col gap-1 justify-start bg-lh-primary-2/10 rounded-xl px-4 py-3 border border-lh-primary-2/10 w-full"
                        >
                            <app-skeleton width="20" height="5" rounded="lg" />
                            <app-skeleton width="48" height="7" rounded="lg" />
                            <div class="flex items-start gap-2 flex-wrap">
                                <app-skeleton width="20" height="7" rounded="full" />
                                <app-skeleton width="20" height="7" rounded="full" />
                                <app-skeleton width="20" height="7" rounded="full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="bg-lh-primary-2/10 shrink-0 rounded-xl px-4 py-3 border border-lh-primary-2/10 text-center flex flex-col justify-between gap-3"
                >
                    <div class="flex items-center justify-center gap-2 mb-1">
                        <app-skeleton width="6" height="6" [circle]="true" />
                        <app-skeleton width="36" height="6" rounded="lg" />
                    </div>
                    <div class="flex items-center justify-center gap-2">
                        <app-skeleton width="6" height="6" [circle]="true" />
                        <app-skeleton width="24" height="7" rounded="lg" />
                        <app-skeleton width="6" height="6" [circle]="true" />
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <app-skeleton width="full" height="5" rounded="lg" />
                        <app-skeleton width="5/6" height="5" rounded="lg" />
                    </div>
                </div>

                <div class="flex gap-2 flex-col">
                    <div
                        class="flex items-center justify-between gap-3 bg-lh-primary-2/10 rounded-xl px-4 py-2 border border-lh-primary-2/10"
                    >
                        <div class="flex items-center gap-2">
                            <app-skeleton width="10" height="10" [circle]="true" />
                            <app-skeleton width="20" height="8" rounded="lg" />
                        </div>
                        <app-skeleton width="24" height="7" rounded="lg" />
                    </div>

                    <app-skeleton width="full" height="10" rounded="xl" />

                    <div class="flex gap-3 w-full">
                        @for (_ of statItems; track $index) {
                            <div
                                class="flex-1 min-w-24 flex flex-col items-center bg-lh-primary-2/10 rounded-xl px-3 py-2 gap-0.5 border border-lh-primary-2/10"
                            >
                                <app-skeleton width="8" height="8" [circle]="true" />
                                <app-skeleton width="16" height="5" rounded="lg" />
                                <app-skeleton width="12" height="7" rounded="lg" />
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSkeletonComponent {
    protected readonly statItems = Array.from({ length: 3 });
}
