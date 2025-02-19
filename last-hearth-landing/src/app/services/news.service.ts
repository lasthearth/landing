import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NewsService {
  public readonly news = [
        {
          title: 'Анонс нового сезона',
          date: '19.02.25 - 20:15',
          description:
                'Рады вам сообщить, что новый сезон планируется открыть <b>28 февраля</b>!<br/>Осталось совсем не много, готовьтесь и собирайте команды!',
        },
        {
          title: 'Как зайти на сервер',
          date: '14.02.25 - 21:35',
          description:
                'Чтобы зайти на сервер, нужно создать анкету регистрации в <a href="https://discord.gg/FZb7SGrSFy" target="_blank" class="text-lh-primary font-bold decoration-1">discord канале.</a><br/>После составления анкеты вам напишет первый освободившийся администратор. ',
        },
        {
          title: 'Запуск сайта',
          date: '14.02.25 - 21:30',
          description:
              'Уважаемые игроки, мы рады вам представить первую версию сайта нашего проекта!',
        }
    ];
}
