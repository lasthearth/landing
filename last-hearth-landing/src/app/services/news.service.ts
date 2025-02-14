import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NewsService {
    public readonly news = [
        {
            id: 1,
            title: 'Как зайти на сервер (туториал)',
            description:
                'Чтобы зайти на сервер, нужно создать анкету регистрации в <a href="https://discord.gg/FZb7SGrSFy" target="_blank" class="text-blue-400 decoration-1">discord канале.</a> <br/>В анкете указывается: <br/>&ensp;— Ваш ник в игре <br/>&ensp;— Откуда вы о нас узнали <br/>&ensp;— Пинг администрации.<br/>После составления анкеты вам напишет первый освободившийся администратор. ',
        },
        {
            id: 0,
            title: 'Запуск сайта',
            description:
                'Уважаемые игроки, мы рады вам представить первую версию сайта нашего проекта!',
        }
    ];
}
