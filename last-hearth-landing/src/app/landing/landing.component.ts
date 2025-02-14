import { Component } from '@angular/core';
import {TuiCarousel} from '@taiga-ui/kit';
import { NewsCardComponent } from '../news-card/news-card.component';

@Component({
  standalone: true,
  selector: 'app-landing',
  imports: [TuiCarousel, NewsCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.less'
})
export class LandingComponent  {
  protected carouselIndex: number = 0;

  private readonly imagesPath: string = '/images/screenshots/';

  protected readonly images: string[] = [
    `${this.imagesPath}screen_1.png`,
    `${this.imagesPath}screen_2.png`,
    `${this.imagesPath}screen_3.png`,
    `${this.imagesPath}screen_4.png`
  ];

  protected readonly news = [
    {
      title: 'Как зайти на сервер (туториал)',
      description:
        'Чтобы зайти на сервер, нужно создать анкету регистрации в <a href="https://discord.gg/FZb7SGrSFy" target="_blank" class="text-blue-400 decoration-1">discord канале.</a> <br/>В анкете указывается: <br/>&ensp;— Ваш ник в игре <br/>&ensp;— Откуда вы о нас узнали <br/>&ensp;— Пинг администрации.<br/>После составления анкеты вам напишет первый освободившийся администратор. ',
    },
    {
      title: 'Запуск сайта',
      description:
        'Уважаемые игроки, мы рады вам представить первую версию сайта нашего проекта!',
    }
  ];
}
