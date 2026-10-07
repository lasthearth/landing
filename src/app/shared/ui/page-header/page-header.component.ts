import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Шапка страницы: заголовок, подзаголовок и действия справа.
 *
 * Одна на все разделы, чтобы заголовки не расходились по размеру, регистру
 * и отступам. Заголовок — в обычном регистре (капсом набираются только
 * названия секций главной и названия новостей/поселений/событий).
 *
 * Действия передаются содержимым: `<app-page-header [title]="…"><button …/></app-page-header>`.
 * Дополнительная строка под подзаголовком — элементом с атрибутом `pageHeaderMeta`.
 * На узком экране действия переносятся под заголовок, а не уезжают за край.
 */
@Component({
    selector: 'app-page-header',
    templateUrl: './page-header.component.html',
    styleUrl: './page-header.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    /**
     * Заголовок страницы (уже переведённый).
     */
    public readonly title = input.required<string>();

    /**
     * Подзаголовок (уже переведённый), необязателен.
     */
    public readonly subtitle = input<string>('');

    /**
     * Уровень заголовка: `h1` для страницы, `h2` — если страница вложена в другую (разделы профиля).
     */
    public readonly level = input<1 | 2>(1);
}
