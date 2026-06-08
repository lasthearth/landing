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
            type: 'Титул',
            image: '/images/knight.webp',
            price: '350 р/мес.',
            path: 'knight',
        },
        {
            title: 'Барон',
            type: 'Титул',
            image: '/images/baron.webp',
            price: '900 р/мес.',
            path: 'baron',
        },
        {
            title: 'Граф',
            type: 'Титул',
            image: '/images/graf.webp',
            price: '1800 р/мес.',
            path: 'graph',
        },
        {
            title: 'Великий герцог',
            type: 'Титул',
            image: '/images/duke.webp',
            price: '6000 р/мес.',
            path: 'duke',
        },

        {
            title: 'Исследователь',
            type: 'Набор',
            image: '/images/explorer.webp',
            price: '500 р/мес.',
            path: 'explorer',
        },
        {
            title: 'Воин',
            type: 'Набор',
            image: '/images/warrior.webp',
            price: '700 р/мес.',
            path: 'warrior',
        },
        {
            title: 'Строитель',
            type: 'Набор',
            image: '/images/builder.webp',
            price: '700 р/мес.',
            path: 'builder',
        },
    ];

    public readonly knightGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.webp',
            count: '3',
        },
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.webp',
            count: '1',
        },
        {
            title: 'Серебряный квинарий',
            image: '/images/title-items/kvinariy.webp',
            count: '25',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.webp',
            count: '1',
        },
    ];

    public readonly baronGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.webp',
            count: '6',
        },
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.webp',
            count: '4',
        },
        {
            title: 'Бронзовое копье',
            image: '/images/title-items/bronze-spear.webp',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.webp',
            count: '1',
        },
        {
            title: 'Кожаный шлем',
            image: '/images/title-items/leather-helmet.webp',
            count: '1',
        },
        {
            title: 'Кожаный нагрудник',
            image: '/images/title-items/leather-breastplate.webp',
            count: '1',
        },
        {
            title: 'Кожаные поножи',
            image: '/images/title-items/leather-greaves.webp',
            count: '1',
        },
        {
            title: 'Серебряный квинарий',
            image: '/images/title-items/kvinariy.webp',
            count: '40',
        },
        {
            title: 'Железный нож',
            image: '/images/title-items/iron-knife.webp',
            count: '1',
        },
        {
            title: 'Ржавая шестеренка',
            image: '/images/title-items/rusty-gear.webp',
            count: '30',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.webp',
            count: '10',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.webp',
            count: '1',
        },
    ];

    public readonly graphGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.webp',
            count: '14',
        },
        {
            title: 'Рюкзак из прочной кожи',
            image: '/images/title-items/durable-leather-backpack.webp',
            count: '2',
        },
        {
            title: 'Железное копье',
            image: '/images/title-items/iron-spear.webp',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.webp',
            count: '1',
        },
        {
            title: 'Шлем из бригантины',
            image: '/images/title-items/brigantine-helmet-iron.webp',
            count: '1',
        },
        {
            title: 'Нагрудник из бригантины',
            image: '/images/title-items/brigantine-breastplate-iron.webp',
            count: '1',
        },
        {
            title: 'Поножи из бригантины',
            image: '/images/title-items/brigantine-greaves-iron.webp',
            count: '1',
        },
        {
            title: 'Золотой динарий',
            image: '/images/title-items/dinariy.webp',
            count: '2',
        },
        {
            title: 'Стальной нож',
            image: '/images/title-items/steel-knife.webp',
            count: '1',
        },
        {
            title: 'Стальной топор',
            image: '/images/title-items/steel-axe.webp',
            count: '2',
        },
        {
            title: 'Стальная лопата',
            image: '/images/title-items/steel-shovel.webp',
            count: '2',
        },
        {
            title: 'Вапити',
            image: '/images/title-items/wapiti.webp',
            count: '1',
        },
        {
            title: 'Седло',
            image: '/images/title-items/saddle.webp',
            count: '1',
        },
        {
            title: 'Уздечка',
            image: '/images/title-items/bridle.webp',
            count: '1',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.webp',
            count: '10',
        },
        {
            title: 'Кабаниха',
            image: '/images/title-items/pig.webp',
            count: '4',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.webp',
            count: '1',
        },
    ];

    public readonly dukeGameItems: IGameItemCard[] = [
        {
            title: 'Темпоральная шестеренка',
            image: '/images/title-items/temporal-gear.webp',
            count: '18',
        },
        {
            title: 'Ржавая шестеренка',
            image: '/images/title-items/rusty-gear.webp',
            count: '100',
        },
        {
            title: 'Рюкзак из прочной кожи',
            image: '/images/title-items/durable-leather-backpack.webp',
            count: '4',
        },
        {
            title: 'Железное копье',
            image: '/images/title-items/iron-spear.webp',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield.webp',
            count: '1',
        },
        {
            title: 'Шлем черного стража',
            image: '/images/title-items/black-helmet.webp',
            count: '1',
        },
        {
            title: 'Нагрудник черного стража',
            image: '/images/title-items/black-breastplate.webp',
            count: '1',
        },
        {
            title: 'Поножи черного стража',
            image: '/images/title-items/black-greaves.webp',
            count: '1',
        },
        {
            title: 'Золотой динарий',
            image: '/images/title-items/dinariy.webp',
            count: '5',
        },
        {
            title: 'Стальной нож',
            image: '/images/title-items/steel-knife.webp',
            count: '1',
        },
        {
            title: 'Стальной топор',
            image: '/images/title-items/steel-axe.webp',
            count: '1',
        },
        {
            title: 'Стальная лопата',
            image: '/images/title-items/steel-shovel.webp',
            count: '1',
        },
        {
            title: 'Стальная кирка',
            image: '/images/title-items/steel-pickaxe.webp',
            count: '1',
        },
        {
            title: 'Стальной молот',
            image: '/images/title-items/steel-hammer.webp',
            count: '1',
        },
        {
            title: 'Стальное зубило',
            image: '/images/title-items/steel-chisel.webp',
            count: '1',
        },
        {
            title: 'Вапити',
            image: '/images/title-items/wapiti.webp',
            count: '1',
        },
        {
            title: 'Седло',
            image: '/images/title-items/saddle.webp',
            count: '1',
        },
        {
            title: 'Уздечка',
            image: '/images/title-items/bridle.webp',
            count: '1',
        },
        {
            title: 'Седельные сумки',
            image: '/images/title-items/saddlebags.webp',
            count: '1',
        },
        {
            title: 'Корабль',
            image: '/images/title-items/sailing-boat.webp',
            count: '1',
        },
        {
            title: 'Курица',
            image: '/images/title-items/chicken.webp',
            count: '20',
        },
        {
            title: 'Петух',
            image: '/images/title-items/hen.webp',
            count: '1',
        },
        {
            title: 'Кабаниха',
            image: '/images/title-items/pig.webp',
            count: '6',
        },
        {
            title: 'Кабан',
            image: '/images/title-items/hog.webp',
            count: '1',
        },
        {
            title: 'Самка толсторога',
            image: '/images/title-items/goat.webp',
            count: '4',
        },
        {
            title: 'Толсторог',
            image: '/images/title-items/bighorn.webp',
            count: '1',
        },
        {
            title: 'Купчая вольного',
            image: '/images/title-items/freedom.webp',
            count: '1',
        },
    ];

    public readonly builderGameItems: IGameItemCard[] = [
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.webp',
            count: '1',
        },
        {
            title: 'Железный молот',
            image: '/images/title-items/iron-hammer.webp',
            count: '1',
        },
        {
            title: 'Железный топор',
            image: '/images/title-items/iron-axe.webp',
            count: '1',
        },
        {
            title: 'Кирка из черной бронзы',
            image: '/images/title-items/black-pickaxe.webp',
            count: '1',
        },
        {
            title: 'Железная пила',
            image: '/images/title-items/iron-saw.webp',
            count: '1',
        },
        {
            title: 'Железное зубило',
            image: '/images/title-items/iron-chisel.webp',
            count: '1',
        },
        {
            title: 'Стальной пантограф',
            image: '/images/title-items/steel-pantograph.webp',
            count: '1',
        },
        {
            title: 'Стальные клинья',
            image: '/images/title-items/steel-wedges.webp',
            count: '14',
        },
        {
            title: 'Стальное клиновое зубило',
            image: '/images/title-items/steel-wedge-chisel.webp',
            count: '1',
        },
        {
            title: 'Стальное чистовое зубило',
            image: '/images/title-items/steel-finishing-chisel.webp',
            count: '1',
        },
        {
            title: 'Строительный раствор',
            image: '/images/title-items/building-mortar.webp',
            count: '384',
        },
    ];

    public readonly explorerGameItems: IGameItemCard[] = [
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.webp',
            count: '2',
        },
        {
            title: 'Рюкзак из прочной кожи',
            image: '/images/title-items/durable-leather-backpack.webp',
            count: '2',
        },
        {
            title: 'Карта',
            image: '/images/title-items/map.webp',
            count: '1',
        },
        {
            title: 'Серебяный секстант',
            image: '/images/title-items/sextant.webp',
            count: '1',
        },
        {
            title: 'Серебряный компас',
            image: '/images/title-items/compas.webp',
            count: '1',
        },
        {
            title: 'Железный нож',
            image: '/images/title-items/iron-knife.webp',
            count: '1',
        },
        {
            title: 'Железный сакс',
            image: '/images/title-items/iron-sax.webp',
            count: '1',
        },
        {
            title: 'Деревянная лестница',
            image: '/images/title-items/wooden-staircase.webp',
            count: '128',
        },
        {
            title: 'Керамический кувшин',
            image: '/images/title-items/jug.webp',
            count: '1',
        },
        {
            title: 'Пемикан',
            image: '/images/title-items/pemmican.webp',
            count: '64',
        },
    ];

    public readonly warriorGameItems: IGameItemCard[] = [
        {
            title: 'Кожаный рюкзак',
            image: '/images/title-items/leather-backpack.webp',
            count: '1',
        },
        {
            title: 'Пернач',
            image: '/images/title-items/pernach.webp',
            count: '1',
        },
        {
            title: 'Щит',
            image: '/images/title-items/shield-2.webp',
            count: '1',
        },
        {
            title: 'Чешуйчатый стальной шлем',
            image: '/images/title-items/scaly-helmet.webp',
            count: '1',
        },
        {
            title: 'Чешуйчатый стальной нагрудник',
            image: '/images/title-items/scaly-breastplate.webp',
            count: '1',
        },
        {
            title: 'Чешуйчатые стальные поножи',
            image: '/images/title-items/scaly-greaves.webp',
            count: '1',
        },
        {
            title: 'Арбалет с лебедкой',
            image: '/images/title-items/crossbow-with-winch.webp',
            count: '1',
        },
        {
            title: 'Лебедка',
            image: '/images/title-items/winch.webp',
            count: '1',
        },
        {
            title: 'Стальной болт',
            image: '/images/title-items/steel-bolt.webp',
            count: '12',
        },
        {
            title: 'Бинт',
            image: '/images/title-items/bandage.webp',
            count: '16',
        },
        {
            title: 'Пеммикан',
            image: '/images/title-items/pemmican.webp',
            count: '64',
        },
    ];
}
