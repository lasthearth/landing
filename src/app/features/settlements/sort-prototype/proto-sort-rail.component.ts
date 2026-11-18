import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ProtoControls, ProtoSortField } from './proto-controls.model';

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Вариант «rail»: сортировка и фильтры надела
 * стоят боковой панелью слева, список наделов — справа.
 * Удалить вместе с папкой sort-prototype, когда вариант выбран.
 */
@Component({
    selector: 'app-proto-sort-rail',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './proto-sort-rail.component.html',
    styleUrl: './proto-sort-rail.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoSortRailComponent {
    /**
     * Управление списком наделов от страницы.
     */
    public readonly controls = input.required<ProtoControls>();

    private readonly i18n = inject(I18nService);

    /**
     * Подсказка активной строки сортировки: куда направлена сортировка.
     */
    protected readonly directionTitle = computed(() =>
        this.i18n.translate(
            this.controls().sortState().direction === 'asc' ? 'settlements.list.sortAsc' : 'settlements.list.sortDesc',
        ),
    );

    /**
     * Включён ли хоть один фильтр: для кнопки сброса.
     */
    protected readonly hasFilters = computed(
        () => !!this.controls().query().trim() || !!this.controls().typeFilter() || !!this.controls().courseFilter(),
    );

    /**
     * Возвращает признак активного поля сортировки.
     *
     * @param field Поле сортировки.
     */
    protected isActive(field: ProtoSortField): boolean {
        return this.controls().sortState().field === field;
    }

    /**
     * Читает поисковую строку из события ввода.
     *
     * @param event Событие ввода.
     */
    protected onSearch(event: Event): void {
        this.controls().setQuery((event.target as HTMLInputElement).value);
    }
}
