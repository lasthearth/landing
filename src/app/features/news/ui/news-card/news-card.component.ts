import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';

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
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

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
     * Показывает диалог подтверждения и эмитит запрос на удаление
     * только после подтверждения пользователя.
     *
     * @param event Событие клика мыши.
     */
    protected onDeleteClick(event: MouseEvent): void {
        event.stopPropagation();

        this.confirmDialog
            .open({
                title: 'Удалить новость?',
                text: `Вы уверены, что хотите удалить новость «${this.title()}»? Это действие нельзя отменить.`,
            })
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.delete.emit();
                }
            });
    }

}
