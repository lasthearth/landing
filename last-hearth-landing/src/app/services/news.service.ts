import { inject, Injectable } from '@angular/core';
import { INews } from './interface/i-news-admin';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { LocalStorageService } from './local-storage.service';
import { Title } from '@angular/platform-browser';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root',
})
export class NewsService {
    private oidcSecurityService: OidcSecurityService = inject(OidcSecurityService);

    public userImage!: string;

    public userName!: string;

    public userId!: string;

    public roles: string[] = [];

    public accessToken!: string;

    private baseUrl = 'https://apiprev.lasthearth.ru/v1';

    private readonly authStateChange$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    public readonly authState$: Observable<boolean> = this.authStateChange$;

    private readonly http: HttpClient = inject(HttpClient);

    private readonly localStorageService = inject(LocalStorageService);

    private readonly userService = inject(UserService);

    public readonly news = [
        {
            title: 'Бета крупного обновления сайта здесь!',
            date: '08.11.25 - 16:30',
            image: '/7.png',
            description:
                'Встречайте реструктуризацию правил, а так же их апдейт к новому сезону.<br>Создавайте свои селения теперь прямо на сайте, управляйте ими и просматривайте чужие! Обновление статистики и много чего еще!',
        },
        {
            title: 'Новый сюзерен и зимне-весенний сезон',
            date: '06.10.25 - 11:00',
            image: '/5.png',
            description:
                'Пройдя все трудности и опередив всех, селение "Люмерия" получило статус города Сюзерена! Напоминаю, что любой может побороться за данный статус и успеть до начала следующего сезона набрать себе репутацию! Сообщаем, что новый, зимне-весенний сезон начнется 30.12.25!',
        },
        {
            title: 'Региональная провинция',
            date: '11.08.25 - 10:00',
            image: '/4.webp',
            description:
                'Селение "Вольная Гавань" достигло уровня Региональной провинции! Поспешите заключить с ними дипломатические соглашения, либо попробовать завоевать заветный чертеж на сталь! Игра продолжается и мы рады приветствовать новых людей! Сможете ли именно вы бросить вызов новой провинции?',
        },
        {
            title: '2 недели сезона - полет нормальный',
            date: '19.07.25 - 12:00',
            image: '/3.webp',
            description:
                'Сезон длится уже более двух недель и это все еще повод начать играть, если так и не решились! Средний онлайн стабильно держится 30+ человек, а это значит, что сезон будет долгим и продуктивным! Приятной игры вам всем!',
        },
        {
            title: 'Старт летнего сезона',
            date: '04.07.25 - 13:00',
            image: '/images/news_1.webp',
            description:
                'Уже сегодня, в 15:00 по МСК произойдет вайп и начнется новый сезон! Начнется новый этап развития. Удачи все выжить, путники!',
        },
        {
            title: 'Запуск нового сезона',
            date: '01.05.25 - 18:00',
            image: '/2.webp',
            description:
                'Все практически готово и сезон вот-вот начнется! Кроме этого мы обновили правила, настоятельно рекомендуем с ними ознакомиться, там содержатся крупные изменения!',
        },
        {
            title: 'Обновление сайта',
            date: '27.04.25 - 12:00',
            image: '/1.webp',
            description:
                'Наш сайт получил крупное обновление! Теперь вся верификация и получение доступа к серверу осуществляется через него. Внесена крупная автоматизация и множество функций, включая регистрацию поселений на подходе!',
        },
    ];

    public createNews$(news: INews) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.userService.accessToken}`,
        });
        return this.http.post<{
            title: string;
            content: string;
            preview: string;
        }>(
            `${this.baseUrl}/news`,
            { title: news.title, content: news.content, preview: news.preview },
            { headers: headers }
        );
    }
}
