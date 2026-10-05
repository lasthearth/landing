import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Скелетон загрузки карточки новости.
 *
 * Отображает пульсирующий placeholder пока новости загружаются.
 * В компактном варианте превью стоит сверху, как у карточки сетки.
 */
@Component({
    selector: 'app-news-skeleton',
    standalone: true,
    templateUrl: './news-skeleton.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsSkeletonComponent {
    /**
     * Компактный вариант для сетки в две колонки.
     */
    public readonly compact = input<boolean>(false);
}
