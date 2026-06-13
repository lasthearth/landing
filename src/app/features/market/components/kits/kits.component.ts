import { Component, inject, signal } from '@angular/core';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { PurchaseDialogComponent, PurchaseDialogData } from '../purchase-dialog/purchase-dialog.component';

@Component({
    selector: 'app-kits',
    imports: [KitItemComponent, TuiIcon, PurchaseDialogComponent],
    templateUrl: './kits.component.html',
    styleUrl: './kits.component.less',
})
export class KitsComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Выбранный срок подписки.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>('month');

    protected readonly kits: PrivilegeCard[] = [
        {
            title: 'Исследователь',
            image: '/images/donat-images/explorer.webp',
            monthPrice: '11500',
            monthPriceOriginal: '',
            seasonPrice: '',
            seasonPriceOriginal: '',
            kitItems: [
                { hint: 'JPS', count: 1, image: '/images/title-items/jps.webp' },
                { hint: 'Темпоральный амулет', count: 1, image: '/images/title-items/temporal_amulet.webp' },
                { hint: 'Темпоральная шестеренка', count: 2, image: '/images/title-items/temporal_gear.webp' },
                { hint: 'Рюкзак из кожи', count: 4, image: '/images/title-items/backpack.webp' },
                { hint: 'Огниво', count: 1, image: '/images/title-items/flint.webp' },
                { hint: 'Нож из железа', count: 1, image: '/images/title-items/knife_iron.webp' },
                { hint: 'Топор из железа', count: 1, image: '/images/title-items/axe_iron.webp' },
                { hint: 'Стальной кинжал', count: 1, image: '/images/title-items/steel_dagger.webp' },
                { hint: 'Планер (красный дракон)', count: 1, image: '/images/title-items/glider.webp' },
                { hint: 'Парусник из дуба', count: 1, image: '/images/title-items/sailboat.webp' },
                { hint: 'Деревянные лестницы', count: 64, image: '/images/title-items/ladder.webp' },
                { hint: 'Сильно сухие рисовые сухари', count: 64, image: '/images/title-items/breadcrumbs.webp' },
                {
                    hint: 'Стеклянная бутылка (2л)',
                    count: 1,
                    image: '/images/title-items/bottle.webp',
                },
            ],
        },
        {
            title: 'Воин',
            image: '/images/donat-images/warrior.webp',
            monthPrice: '7500',
            monthPriceOriginal: '',
            seasonPrice: '',
            seasonPriceOriginal: '',
            kitItems: [
                { hint: 'Чешуйчатый шлем из железа', count: 1, image: '/images/title-items/scaly_iron_helmet.webp' },
                {
                    hint: 'Чешуйчатый нагрудник из железа',
                    count: 1,
                    image: '/images/title-items/scaly_iron_breastplate.webp',
                },
                { hint: 'Чешуйчатые поножи из железа', count: 1, image: '/images/title-items/scaly_iron_greaves.webp' },
                {
                    hint: 'Красный украшенный железный щит',
                    count: 1,
                    image: '/images/title-items/red_deco_iron_shield.webp',
                },
                { hint: 'Стальной клеймор', count: 1, image: '/images/title-items/steel_claymore.webp' },
                { hint: 'Ножны', count: 1, image: '/images/title-items/sword_pouch.webp' },
                { hint: 'Пояс для подсумка', count: 1, image: '/images/title-items/bugs_belt.webp' },
                { hint: 'Арбалет с лебедкой', count: 1, image: '/images/title-items/crossbow_winch.webp' },
                { hint: 'Лебедка', count: 1, image: '/images/title-items/winch.webp' },
                { hint: 'Стальной болт', count: 12, image: '/images/title-items/bolt_steel.webp' },
                { hint: 'Подсумок для болтов', count: 1, image: '/images/title-items/crossbow_pouch.webp' },
                { hint: 'Медово-серная припарка', count: 16, image: '/images/title-items/poultice_of_cloth.webp' },
                { hint: 'Сильно сухие рисовые сухари', count: 64, image: '/images/title-items/breadcrumbs.webp' },
            ],
        },
        {
            title: 'Строитель',
            image: '/images/donat-images/builder.webp',
            monthPrice: '9500',
            monthPriceOriginal: '',
            seasonPrice: '',
            seasonPriceOriginal: '',
            kitItems: [
                { hint: 'Молот из железа', count: 1, image: '/images/title-items/hummer_iron.webp' },
                { hint: 'Зубило из железа', count: 1, image: '/images/title-items/chisel_iron.webp' },
                { hint: 'Пила из железа', count: 1, image: '/images/title-items/saw_iron.webp' },
                { hint: 'Топор из железа', count: 1, image: '/images/title-items/axe_iron.webp' },
                { hint: 'Кирка из меди', count: 1, image: '/images/title-items/pickaxe_copper.webp' },
                { hint: 'Пантограф из железа', count: 1, image: '/images/title-items/pantograph.webp' },
                { hint: 'Рубанок из железа', count: 1, image: '/images/title-items/iron_hand_planer.webp' },
                { hint: 'Клиновое зубило из стали', count: 1, image: '/images/title-items/steel_wedge_chisel.webp' },
                {
                    hint: 'Чистовое зубило из стали',
                    count: 1,
                    image: '/images/title-items/finishing_chisel_steel.webp',
                },
                { hint: 'Грубое зубило из стали', count: 1, image: '/images/title-items/rough_chisel_steel.webp' },
                { hint: 'Молот для щебня из стали', count: 1, image: '/images/title-items/crushed_hammer_steel.webp' },
                { hint: 'Клинья из стали', count: 14, image: '/images/title-items/wedges.webp' },
                { hint: 'Строительный раствор', count: 256, image: '/images/title-items/mortar.webp' },
            ],
        },
        {
            title: 'Фермер',
            image: '/images/donat-images/farmer.webp',
            monthPrice: '7500',
            monthPriceOriginal: '',
            seasonPrice: '',
            seasonPriceOriginal: '',
            kitItems: [
                { hint: 'Чернозем', count: 128, image: '/images/title-items/humus.webp' },
                { hint: 'Компост', count: 256, image: '/images/title-items/compost.webp' },
                { hint: 'Семена льна', count: 32, image: '/images/title-items/flax.webp' },
                { hint: 'Семена лука', count: 32, image: '/images/title-items/onion.webp' },
                { hint: 'Семена моркови', count: 32, image: '/images/title-items/carrot.webp' },
                { hint: 'Семена капусты', count: 32, image: '/images/title-items/cabbage.webp' },
                { hint: 'Семена риса', count: 32, image: '/images/title-items/rice.webp' },
                { hint: 'Семена полбы', count: 32, image: '/images/title-items/spelt.webp' },
                { hint: 'Виноград красный', count: 1, image: '/images/title-items/red_grape.webp' },
                { hint: 'Виноград зеленый', count: 1, image: '/images/title-items/green_grape.webp' },
                { hint: 'Черенок розовой яблони', count: 16, image: '/images/title-items/pink_apple.webp' },
                { hint: 'Соковыжималка', count: 1, image: '/images/title-items/juicer.webp' },
                { hint: 'Термометр', count: 1, image: '/images/title-items/thermometer.webp' },
                {
                    hint: 'Малая демижонная бутылка (5л)',
                    count: 1,
                    image: '/images/title-items/big_bottle.webp',
                },
                { hint: 'Мотыга из стали', count: 1, image: '/images/title-items/hoe_steel.webp' },
                { hint: 'Ножницы из стали', count: 1, image: '/images/title-items/shears_steel.webp' },
                { hint: 'Коса из стали', count: 1, image: '/images/title-items/scythe_steel.webp' },
                { hint: 'Полотняный мешок', count: 2, image: '/images/title-items/linen_bag.webp' },
                { hint: 'Толсторог', count: 2, image: '/images/title-items/ram.webp' },
                { hint: 'Самка толсторога', count: 10, image: '/images/title-items/sheep.webp' },
                { hint: 'Ведро', count: 1, image: '/images/title-items/bucket.webp' },
                { hint: 'Большое корыто', count: 4, image: '/images/title-items/trough.webp' },
            ],
        },
    ];

    protected selectedPrivilege: PrivilegeCard = this.kits[0];

    /**
     * Вычисляет процент скидки.
     *
     * @param price Текущая цена.
     * @param originalPrice Оригинальная цена до скидки.
     * @returns Процент скидки или 0.
     */
    /**
     * Открывает диалог покупки выбранного набора.
     */
    protected openPurchaseDialog(): void {
        const p = this.selectedPrivilege;
        const term = this.selectedTerm();
        const data: PurchaseDialogData = {
            title: p.title,
            image: p.image,
            monthPrice: p.monthPrice,
            seasonPrice: p.seasonPrice,
            currency: 'rubles',
            initialTerm: term,
            kitItems: p.kitItems,
            dailyKitItems: p.dailyKitItems,
        };
        this.dialogs.open(new PolymorpheusComponent(PurchaseDialogComponent), { size: 'auto', data }).subscribe();
    }

    protected getDiscountPercent(price: string, originalPrice: string): number {
        if (!originalPrice || !price) {
            return 0;
        }
        const original = parseInt(originalPrice.replace(/\D/g, ''), 10);
        const current = parseInt(price.replace(/\D/g, ''), 10);
        if (!original || !current) {
            return 0;
        }
        return Math.round(((original - current) / original) * 100);
    }
}
