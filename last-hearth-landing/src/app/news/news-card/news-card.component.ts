import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { INews } from '../interfaces/i-news';

/**
 * Компонент карточки новости.
 */
@Component({
    standalone: true,
    selector: 'app-news-card',
    templateUrl: './news-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
    /**
     * Данные новости.
     */
    public data: InputSignal<INews> = input.required();
}
