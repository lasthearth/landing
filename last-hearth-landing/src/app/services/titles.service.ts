import { Injectable } from '@angular/core';
import { ITitles } from '../titles/interfaces/i-titles';
import { IGameItemCard } from '../titles/interfaces/i-game-item';

@Injectable({
    providedIn: 'root',
})
export class TitlesService {
    public readonly titles: ITitles[] = [
        {
            title: 'Рыцарь',
            image: '/images/knight.jpg',
            price: '350 р/мес.',
            path: 'knight',
        },
        {
            title: 'Барон',
            image: '/images/baron.jpg',
            price: '900 р/мес.',
            path: 'baron',
        },
        {
            title: 'Граф',
            image: '/images/graf.jpg',
            price: '1800 р/мес.',
            path: 'graph',
        },
        {
            title: 'Великий герцог',
            image: '/images/duke.jpg',
            price: '6000 р/мес.',
            path: 'duke',
        },
    ];

    public readonly knightGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.png',
            count: '3',
        },
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.png',
            count: '1',
        },
        {
            title: 'Серебряный квинарий',
            image: '/images/title-items/kvinariy.png',
            count: '25',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.png',
            count: '1',
        },
    ];

    public readonly baronGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.png',
            count: '6',
        },
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.png',
            count: '4',
        },
        {
            title: 'Бронзовое копье',
            image: '/images/title-items/bronze-spear.png',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.png',
            count: '1',
        },
        {
            title: 'Кожаный шлем',
            image: '/images/title-items/leather-helmet.png',
            count: '1',
        },
        {
            title: 'Кожаный нагрудник',
            image: '/images/title-items/leather-breastplate.png',
            count: '1',
        },
        {
            title: 'Кожаные поножи',
            image: '/images/title-items/leather-greaves.png',
            count: '1',
        },
        {
            title: 'Серебряный квинарий',
            image: '/images/title-items/kvinariy.png',
            count: '40',
        },
        {
            title: 'Железный нож',
            image: '/images/title-items/iron-knife.png',
            count: '1',
        },
        {
            title: 'Ржавая шестеренка',
            image: '/images/title-items/rusty-gear.png',
            count: '30',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.png',
            count: '10',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.png',
            count: '1',
        },
    ];

    public readonly graphGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.png',
            count: '14',
        },
        {
            title: 'Рюкзак из прочной кожи',
            image: '/images/title-items/durable-leather-backpack.png',
            count: '2',
        },
        {
            title: 'Железное копье',
            image: '/images/title-items/iron-spear.png',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.png',
            count: '1',
        },
        {
            title: 'Шлем из бригантины',
            image: '/images/title-items/brigantine-helmet-iron.png',
            count: '1',
        },
        {
            title: 'Нагрудник из бригантины',
            image: '/images/title-items/brigantine-breastplate-iron.png',
            count: '1',
        },
        {
            title: 'Поножи из бригантины',
            image: '/images/title-items/brigantine-greaves-iron.png',
            count: '1',
        },
        {
            title: 'Золотой динарий',
            image: '/images/title-items/dinariy.png',
            count: '2',
        },
        {
            title: 'Стальной нож',
            image: '/images/title-items/steel-knife.png',
            count: '1',
        },
        {
            title: 'Стальной топор',
            image: '/images/title-items/steel-axe.png',
            count: '2',
        },
        {
            title: 'Стальная лопата',
            image: '/images/title-items/steel-shovel.png',
            count: '2',
        },
        {
            title: 'Вапити',
            image: '/images/title-items/wapiti.png',
            count: '1',
        },
        {
            title: 'Седло',
            image: '/images/title-items/saddle.png',
            count: '1',
        },
        {
            title: 'Уздечка',
            image: '/images/title-items/bridle.png',
            count: '1',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.png',
            count: '10',
        },
        {
            title: 'Кабаниха',
            image: '/images/title-items/pig.png',
            count: '4',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.png',
            count: '1',
        },
    ];

    public readonly dukeGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.png',
            count: '18',
        },
        {
            title: 'Ржавая шестеренка',
            image: '/images/title-items/rusty-gear.png',
            count: '100',
        },
        {
            title: 'Рюкзак из прочной кожи',
            image: '/images/title-items/durable-leather-backpack.png',
            count: '4',
        },
        {
            title: 'Железное копье',
            image: '/images/title-items/iron-spear.png',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.png',
            count: '1',
        },
        {
            title: 'Шлем черного стража',
            image: '/images/title-items/black-helmet.png',
            count: '1',
        },
        {
            title: 'Нагрудник черного стража',
            image: '/images/title-items/black-breastplate.png',
            count: '1',
        },
        {
            title: 'Поножи черного стража',
            image: '/images/title-items/black-greaves.png',
            count: '1',
        },
        {
            title: 'Золотой динарий',
            image: '/images/title-items/dinariy.png',
            count: '5',
        },
        {
            title: 'Стальной нож',
            image: '/images/title-items/steel-knife.png',
            count: '1',
        },
        {
            title: 'Стальной топор',
            image: '/images/title-items/steel-axe.png',
            count: '1',
        },
        {
            title: 'Стальная лопата',
            image: '/images/title-items/steel-shovel.png',
            count: '1',
        },
        {
            title: 'Стальная кирка',
            image: '/images/title-items/steel-pickaxe.png',
            count: '1',
        },
        {
            title: 'Стальной молот',
            image: '/images/title-items/steel-hammer.png',
            count: '1',
        },
        {
            title: 'Стальное зубило',
            image: '/images/title-items/steel-chisel.png',
            count: '1',
        },
        {
            title: 'Вапити',
            image: '/images/title-items/wapiti.png',
            count: '1',
        },
        {
            title: 'Седло',
            image: '/images/title-items/saddle.png',
            count: '1',
        },
        {
            title: 'Уздечка',
            image: '/images/title-items/bridle.png',
            count: '1',
        },
        {
            title: 'Седельные сумки',
            image: '/images/title-items/saddlebags.png',
            count: '1',
        },
        {
            title: 'Корабль',
            image: '/images/title-items/sailing-boat.png',
            count: '1',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.png',
            count: '20',
        },
        {
            title: 'Петух',
            image: '/images/title-items/hen.png',
            count: '1',
        },
        {
            title: 'Кабаниха',
            image: '/images/title-items/pig.png',
            count: '6',
        },
        {
            title: 'Кабан',
            image: '/images/title-items/hog.png',
            count: '1',
        },
        {
            title: 'Самка толсторога',
            image: '/images/title-items/goat.png',
            count: '4',
        },
        {
            title: 'Толсторог',
            image: '/images/title-items/bighorn.png',
            count: '1',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.png',
            count: '1',
        },
    ];
}
