import { Component, input, InputSignal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-news-card',
  templateUrl: './news-card.component.html',
  styleUrl: './news-card.component.less'
})
export class NewsCardComponent {
  public title: InputSignal<string> = input.required();

  public description: InputSignal<string> = input.required();
}
