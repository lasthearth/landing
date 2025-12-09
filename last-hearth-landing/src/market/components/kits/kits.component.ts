import { Component } from '@angular/core';
import { TuiCarousel } from '@taiga-ui/kit';
import { PrivilegeCarouselTemplateComponent } from '../../templates/privilege-carousel-template/privilege-carousel-template.component';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { PrivilegeCardComponent } from '../../ui/privilege-card/privilege-card.component';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';

@Component({
    selector: 'app-kits',
    imports: [PrivilegeCardComponent, PrivilegeCarouselTemplateComponent, TuiCarousel, KitItemComponent],
    templateUrl: './kits.component.html',
})
export class KitsComponent {
    protected readonly titles: PrivilegeCard[] = [
        {
            title: 'Исследователь',
            image: '/images/donat-images/explorer.webp',
            price: '950 р',
            kitItems: [
                { hint: 'JPS', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Темпоральный амулет', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Темпоральная шестеренка', count: 2, image: '/images/title-items/goat.webp' },
                { hint: 'Рюкзак из кожи', count: 4, image: '/images/title-items/goat.webp' },
                { hint: 'Огниво', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Нож из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Топор из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Стальной кинжал', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Планер (красный дракон)', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Парусник из дуба', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Деревянные лестницы', count: 64, image: '/images/title-items/goat.webp' },
                { hint: 'Сильно сухие рисовые сухари', count: 64, image: '/images/title-items/goat.webp' },
                {
                    hint: 'Стеклянная бутылка (2л)',
                    count: 1,
                    image: '/images/title-items/goat.webp',
                },
            ],
        },
        {
            title: 'Воин',
            image: '/images/donat-images/warrior.webp',
            price: '700 р',
            kitItems: [
                { hint: 'Чешуйчатый шлем из железа', count: 1, image: '/images/title-items/goat.webp' },
                {
                    hint: 'Чешуйчатый нагрудник из железа',
                    count: 1,
                    image: '/images/title-items/goat.webp',
                },
                { hint: 'Чешуйчатые поножи из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Красный украшенный железный щит', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Стальной клеймор', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Ножны', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Пояс для подсумка', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Арбалет с лебедкой', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Лебедка', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Стальной болт', count: 12, image: '/images/title-items/goat.webp' },
                { hint: 'Подсумок для болтов', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Медово-серная припарка', count: 16, image: '/images/title-items/goat.webp' },
                { hint: 'Сильно сухие рисовые сухари', count: 64, image: '/images/title-items/goat.webp' },
            ],
        },
        {
            title: 'Строитель',
            image: '/images/donat-images/builder.webp',
            price: '500 р',
            kitItems: [
                { hint: 'Молот из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Зубило из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Пила из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Топор из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Кирка из меди', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Пантограф из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Рубанок из железа', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Клиновое зубило из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Чистовое зубило из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Грубое зубило из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Молот для щебня из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Клинья из стали', count: 14, image: '/images/title-items/goat.webp' },
                { hint: 'Строительный раствор', count: 256, image: '/images/title-items/goat.webp' },
            ],
        },
        {
            title: 'Фермер',
            image: '/images/donat-images/farmer.webp',
            price: '950 р',
            kitItems: [
                { hint: 'Чернозем', count: 128, image: '/images/title-items/goat.webp' },
                { hint: 'Компост', count: 256, image: '/images/title-items/goat.webp' },
                { hint: 'Семена льна', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Семена лука', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Семена моркови', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Семена капусты', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Семена риса', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Семена полбы', count: 32, image: '/images/title-items/goat.webp' },
                { hint: 'Виноград красный', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Виноград зеленый', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Черенок розовой яблони', count: 16, image: '/images/title-items/goat.webp' },
                { hint: 'Соковыжималка', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Термометр', count: 1, image: '/images/title-items/goat.webp' },
                {
                    hint: 'Малая демижонная бутылка (5л)',
                    count: 1,
                    image: '/images/title-items/goat.webp',
                },
                { hint: 'Мотыга из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Ножницы из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Коса из стали', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Полотняный мешок', count: 2, image: '/images/title-items/goat.webp' },
                { hint: 'Толсторог', count: 2, image: '/images/title-items/goat.webp' },
                { hint: 'Самка толсторога', count: 10, image: '/images/title-items/goat.webp' },
                { hint: 'Ведро', count: 1, image: '/images/title-items/goat.webp' },
                { hint: 'Большое корыто', count: 4, image: '/images/title-items/goat.webp' },
            ],
        },
    ];

    protected selectedPrivilege: PrivilegeCard = this.titles[0];
}
