import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Компонент карточки новости.
 *
 * Отображает заголовок, содержание, превью и дату публикации.
 * При наличии прав доступа отображает кнопку удаления.
 */
@Component({
    standalone: true,
    selector: 'app-news-card',
    imports: [TuiIcon],
    templateUrl: './news-card.component.html',
    styleUrl: './news-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
    /**
     * Заголовок новости.
     */
    public readonly title = input.required<string>();

    /**
     * Содержание новости (HTML-разметка).
     */
    public readonly content = input.required<string>();

    /**
     * URL превью-изображения новости.
     */
    public readonly preview = input.required<string>();

    /**
     * Дата публикации новости в отформатированном виде.
     */
    public readonly date = input.required<string>();

    /**
     * Количество просмотров новости.
     */
    public readonly viewCount = input<number>(0);

    /**
     * Автор новости (идентификатор или имя).
     */
    public readonly createdBy = input<string>('');

    /**
     * Флаг, указывающий, может ли текущий пользователь удалять новость.
     *
     * При значении `true` отображается кнопка удаления.
     */
    public readonly canDelete = input<boolean>(false);

    /**
     * Событие удаления новости.
     *
     * Вызывается при нажатии на кнопку удаления.
     */
    public readonly delete = output<void>();

    /**
     * Обрабатывает клик по кнопке удаления.
     *
     * Предотвращает всплытие события и эмитит запрос на удаление.
     *
     * @param event Событие клика мыши.
     */
    protected onDeleteClick(event: MouseEvent): void {
        event.stopPropagation();
        this.delete.emit();
    }

}
