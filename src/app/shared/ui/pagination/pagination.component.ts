import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { buildPaginationPages } from '@shared/lib/pagination';

/**
 * Нумерация страниц списка.
 *
 * Стрелки и номера одинаково понятны и мышью, и с клавиатуры: текущая
 * страница помечена `aria-current="page"`, длинный ряд сворачивается
 * в «1 … 4 5 6 … 12», а на телефоне остаются только стрелки и «X из Y».
 */
@Component({
    selector: 'app-pagination',
    imports: [TranslatePipe, TuiIcon],
    templateUrl: './pagination.component.html',
    styleUrl: './pagination.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
    /**
     * Текущая страница (с единицы).
     */
    public readonly page = input.required<number>();

    /**
     * Сколько всего записей.
     */
    public readonly total = input.required<number>();

    /**
     * Размер страницы.
     */
    public readonly pageSize = input.required<number>();

    /**
     * Запрошена другая страница.
     */
    public readonly pageChange = output<number>();

    /**
     * Сколько всего страниц.
     */
    protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))));

    /**
     * Номера страниц и разрывы между ними.
     */
    protected readonly items = computed(() => buildPaginationPages(this.page(), this.pages()));

    /**
     * Есть ли предыдущая страница.
     */
    protected readonly hasPrev = computed(() => this.page() > 1);

    /**
     * Есть ли следующая страница.
     */
    protected readonly hasNext = computed(() => this.page() < this.pages());

    /**
     * Запрашивает страницу, если она есть и отличается от текущей.
     *
     * @param page Номер страницы.
     */
    protected go(page: number): void {
        if (page >= 1 && page <= this.pages() && page !== this.page()) {
            this.pageChange.emit(page);
        }
    }
}
