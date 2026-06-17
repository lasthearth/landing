import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон списка карточек для админ-панелей.
 *
 * Имитирует карточки заявок с аватаром, заголовком, текстом и кнопками действий.
 */
@Component({
    selector: 'app-admin-list-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div class="flex flex-col gap-4">
            @for (_ of itemsArray(); track $index) {
                <div
                    class="bg-[#e2d7bb] border-2 border-[#bdb093]/40 shadow-md rounded-2xl p-5 flex flex-col gap-4 animate-pulse"
                >
                    <div class="flex items-center gap-3 pb-3 border-b border-lh-primary-2/20">
                        <app-skeleton width="14" height="14" [circle]="true" className="shrink-0 bg-lh-primary-2/20" />
                        <div class="flex flex-col gap-2 min-w-0 flex-1">
                            <app-skeleton width="20" height="4" rounded="lg" className="bg-lh-primary-2/20" />
                            <app-skeleton width="3/4" height="6" rounded="lg" className="bg-lh-primary-2/30" />
                        </div>
                    </div>

                    <div class="bg-lh-primary-2/15 border border-lh-primary-2/20 rounded-xl p-4 flex flex-col gap-2">
                        <app-skeleton width="full" height="5" rounded="lg" className="bg-lh-primary-2/20" />
                        <app-skeleton width="2/3" height="4" rounded="lg" className="bg-lh-primary-2/20" />
                    </div>

                    <div class="flex gap-3 justify-end pt-1">
                        <app-skeleton width="28" height="10" rounded="xl" className="bg-lh-primary-2/20" />
                        <app-skeleton width="28" height="10" rounded="xl" className="bg-lh-primary-2/30" />
                    </div>
                </div>
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminListSkeletonComponent {
    /**
     * Количество карточек-скелетонов.
     */
    public readonly count = input<number>(3);

    protected readonly itemsArray = computed(() => Array.from({ length: this.count() }));
}
