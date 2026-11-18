import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ProtoControls, ProtoFilterToken, ProtoSortField } from './proto-controls.model';

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Вариант «inline»: сортировка надела — сегментный
 * переключатель с кнопкой направления, фильтры спрятаны за кнопку и видны
 * удаляемыми токенами. Удалить вместе с папкой sort-prototype, когда вариант выбран.
 */
@Component({
    selector: 'app-proto-sort-inline',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './proto-sort-inline.component.html',
    styleUrl: './proto-sort-inline.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoSortInlineComponent {
    /**
     * Управление списком наделов от страницы.
     */
    public readonly controls = input.required<ProtoControls>();

    /**
     * Открыта ли панель групп фильтров.
     */
    protected readonly open = signal(false);

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
     * Активные фильтры типа и курса в виде удаляемых токенов.
     */
    protected readonly tokens = computed(() => {
        const list: ProtoFilterToken[] = [];
        const type = this.controls().typeFilter();
        const course = this.controls().courseFilter();

        if (type) {
            list.push({ kind: 'type', value: type });
        }

        if (course) {
            list.push({ kind: 'course', value: course });
        }

        return list;
    });

    /**
     * Возвращает признак активного поля сортировки.
     *
     * @param field Поле сортировки.
     */
    protected isActive(field: ProtoSortField): boolean {
        return this.controls().sortState().field === field;
    }

    /**
     * Снимает фильтр по токену.
     *
     * @param token Токен фильтра.
     */
    protected removeToken(token: ProtoFilterToken): void {
        if (token.kind === 'type') {
            this.controls().toggleType(token.value);
            return;
        }

        this.controls().toggleCourse(token.value);
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
