import { Component, input, InputSignal } from '@angular/core';
import { INews } from '../interfaces/i-news';

@Component({
    standalone: true,
    selector: 'app-news-card',
    templateUrl: './news-card.component.html',
    styleUrl: './news-card.component.less'
})
export class NewsCardComponent {
    public news: InputSignal<INews> = input.required();
}
