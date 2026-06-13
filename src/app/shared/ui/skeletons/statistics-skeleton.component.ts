import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон страницы рейтинга игроков.
 */
@Component({
    selector: 'app-statistics-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div class="flex flex-col gap-8">
            <app-skeleton width="64" height="10" rounded="xl" />

            <div class="flex gap-8 lg:gap-16 items-center justify-center mb-16">
                <div class="flex flex-col items-center gap-2">
                    <app-skeleton width="32" height="32" [circle]="true" />
                    <app-skeleton width="24" height="6" rounded="lg" />
                    <app-skeleton width="16" height="8" rounded="lg" />
                </div>
                <div class="flex flex-col items-center gap-2">
                    <app-skeleton width="40" height="40" [circle]="true" />
                    <app-skeleton width="24" height="6" rounded="lg" />
                    <app-skeleton width="16" height="8" rounded="lg" />
                </div>
                <div class="flex flex-col items-center gap-2">
                    <app-skeleton width="32" height="32" [circle]="true" />
                    <app-skeleton width="24" height="6" rounded="lg" />
                    <app-skeleton width="16" height="8" rounded="lg" />
                </div>
            </div>

            <div class="flex flex-col gap-6">
                @for (_ of rows; track $index) {
                    <div class="h-24 rounded-2xl bg-lh-primary-2/30 animate-pulse"></div>
                }
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsSkeletonComponent {
    protected readonly rows = Array.from({ length: 5 });
}
