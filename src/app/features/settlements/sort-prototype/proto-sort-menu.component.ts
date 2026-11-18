import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ProtoControls, ProtoSortField } from './proto-controls.model';

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Вариант «menu»: сортировка и фильтры надела
 * умещаются в одну строку, а их списки открываются из кнопок.
 * Удалить вместе с папкой sort-prototype, когда вариант выбран.
 */
@Component({
    selector: 'app-proto-sort-menu',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './proto-sort-menu.component.html',
    styleUrl: './proto-sort-menu.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoSortMenuComponent {
    /**
     * Управление списком наделов от страницы.
     */
    public readonly controls = input.required<ProtoControls>();

    /**
     * Ключ открытого списка: sort, filters или null — всё закрыто.
     */
    protected readonly open = signal<'sort' | 'filters' | null>(null);

    private readonly i18n = inject(I18nService);

    /**
     * Подсказка кнопки направления сортировки.
     */
    protected readonly directionTitle = computed(() =>
        this.i18n.translate(
            this.controls().sortState().direction === 'asc' ? 'settlements.list.sortAsc' : 'settlements.list.sortDesc',
        ),
    );

    /**
     * Число активных фильтров для значка на кнопке.
     */
    protected readonly activeFilters = computed(
        () => (this.controls().typeFilter() ? 1 : 0) + (this.controls().courseFilter() ? 1 : 0),
    );

    /**
     * Открывает указанный список и закрывает соседний.
     *
     * @param menu Ключ списка.
     */
    protected toggle(menu: 'sort' | 'filters'): void {
        this.open.set(this.open() === menu ? null : menu);
    }

    /**
     * Закрывает открытый список по клику на подложку.
     */
    protected close(): void {
        this.open.set(null);
    }

    /**
     * Выбирает поле сортировки из списка и закрывает список.
     *
     * @param field Поле сортировки.
     */
    protected pickSort(field: ProtoSortField): void {
        this.controls().setSort(field);
        this.open.set(null);
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
