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
     * Заголовок новости.
     */
    public title: InputSignal<string> = input.required();

    /**
     * Содержание новости.
     */
    public content: InputSignal<string> = input.required();

    /**
     * Превью(Изображение) новости.
     */
    public preview: InputSignal<string> = input.required();

    /**
     * Дата созджания новости.
     */
    public date: InputSignal<string> = input.required();
}
