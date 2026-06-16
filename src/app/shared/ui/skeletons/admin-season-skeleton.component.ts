import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон карточки текущего сезона в админ-панели Hunger Games.
 */
@Component({
    selector: 'app-admin-season-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-lh-primary-2/10 border border-lh-primary-2/10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        >
            <div class="flex flex-col gap-4">
                <app-skeleton width="48" height="10" rounded="xl" />
                <div class="flex flex-col gap-2">
                    <app-skeleton width="56" height="7" rounded="lg" />
                    <app-skeleton width="48" height="7" rounded="lg" />
                    <app-skeleton width="40" height="8" rounded="lg" />
                </div>
            </div>
            <div class="flex gap-3">
                <app-skeleton width="36" height="10" rounded="xl" />
                <app-skeleton width="36" height="10" rounded="xl" />
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSeasonSkeletonComponent {}
