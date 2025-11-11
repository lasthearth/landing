import { ChangeDetectionStrategy, Component, Input, input, InputSignal } from '@angular/core';
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
    public title: InputSignal<string> = input.required();
    public content: InputSignal<string> = input.required();
    public preview: InputSignal<string> = input.required();
    public date: InputSignal<string> = input.required();
}
