import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NewsService {
    public readonly news = [
        {
            id: 1,
            title: 'Как зайти на сервер',
            description:
                'Чтобы зайти на сервер, нужно создать анкету регистрации в <a href="https://discord.gg/FZb7SGrSFy" target="_blank" class="text-[#3f3c34] font-bold decoration-1">discord канале.</a><br/>После составления анкеты вам напишет первый освободившийся администратор. ',
        },
        {
            id: 0,
            title: 'Запуск сайта',
            description:
                'Уважаемые игроки, мы рады вам представить первую версию сайта нашего проекта!',
        }
    ];
}
