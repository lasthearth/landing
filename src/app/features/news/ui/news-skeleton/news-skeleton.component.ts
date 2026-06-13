import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Скелетон загрузки карточки новости.
 *
 * Отображает пульсирующий placeholder пока новости загружаются.
 */
@Component({
    selector: 'app-news-skeleton',
    standalone: true,
    templateUrl: './news-skeleton.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsSkeletonComponent {}
