import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Скелетон таблицы для админ-панелей.
 */
@Component({
    selector: 'app-admin-table-skeleton',
    standalone: true,
    imports: [SkeletonComponent],
    template: `
        <div class="overflow-x-auto rounded-2xl border border-[#bdb093] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <table class="w-full text-left border-collapse text-[18px]">
                <thead class="bg-lh-primary text-[#e2d7bb] font-semibold uppercase">
                    <tr>
                        @for (_ of columnsArray(); track $index) {
                            <th class="p-4">
                                <app-skeleton
                                    width="16"
                                    height="5"
                                    rounded="lg"
                                    className="bg-[#e2d7bb]/30"
                                />
                            </th>
                        }
                    </tr>
                </thead>
                <tbody>
                    @for (_ of rowsArray(); track $index; let rowIndex = $index) {
                        <tr class="border-t border-[#bdb093]">
                            @for (_ of columnsArray(); track $index; let colIndex = $index) {
                                <td class="p-4">
                                    <app-skeleton
                                        [width]="colIndex === 0 ? '8' : 'full'"
                                        height="6"
                                        rounded="lg"
                                    />
                                </td>
                            }
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTableSkeletonComponent {
    /**
     * Количество колонок.
     */
    public readonly columns = input<number>(5);

    /**
     * Количество строк.
     */
    public readonly rows = input<number>(5);

    protected readonly columnsArray = computed(() => Array.from({ length: this.columns() }));
    protected readonly rowsArray = computed(() => Array.from({ length: this.rows() }));
}
