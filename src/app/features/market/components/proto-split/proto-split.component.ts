import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, TranslatePipe } from '@core/i18n';
import { DonateService, IShopItem, IShopSection, SHOP_SECTIONS } from '@entities/donate';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RevealDirective } from '@shared/lib/directives';

/**
 * ПРОТОТИП варианта «Сплит»: витрина с постоянной боковой панелью.
 *
 * Отвечает на вопрос, помогает ли покупателю липкая панель с балансом,
 * пополнением, быстрыми подборками и разделами, пока он листает сетку.
 * Код одноразовый: покупка и пополнение не подключены.
 */
@Component({
    selector: 'app-proto-split',
    imports: [AmountPipe, TranslatePipe, TuiIcon, ImageLoaderComponent, RevealDirective],
    templateUrl: './proto-split.component.html',
    styleUrl: './proto-split.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoSplitComponent {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Товары витрины.
     *
     * Сбой не показываем отдельным состоянием: прототип проверяет раскладку,
     * а не обработку ошибок, поэтому список просто остаётся пустым.
     */
    protected readonly items = toSignal(
        this.donateService.getShopItemsOrThrow$().pipe(catchError(() => of([] as IShopItem[]))),
        { initialValue: [] as IShopItem[] }
    );

    /**
     * Баланс осколков; `null` — баланс ещё не пришёл или недоступен.
     */
    protected readonly balance = toSignal(
        this.donateService.watchMyBalance$().pipe(
            map((response) => response.coins),
            catchError(() => of(null))
        ),
        { initialValue: null }
    );

    /**
     * Разделы витрины в порядке `SHOP_SECTIONS`.
     */
    protected readonly sections: readonly IShopSection[] = SHOP_SECTIONS;

    /**
     * Выбранный раздел, пустая строка — «Все».
     */
    protected readonly selectedSection = signal('');

    /**
     * Число товаров в каждом разделе, по ключу раздела.
     */
    protected readonly sectionCounts = computed<Map<string, number>>(() => {
        const counts = new Map<string, number>();

        for (const item of this.items()) {
            counts.set(item.section, (counts.get(item.section) ?? 0) + 1);
        }

        return counts;
    });

    /**
     * Товары выбранного раздела; для «Все» — все товары.
     */
    protected readonly visibleItems = computed<IShopItem[]>(() => {
        const key = this.selectedSection();

        return key ? this.items().filter((item) => item.section === key) : this.items();
    });

    /**
     * Три самых дешёвых доступных товара.
     *
     * Цена приходит строкой decimal, поэтому сравнивается через `Number()`.
     */
    protected readonly cheapestItems = computed<IShopItem[]>(() =>
        this.items()
            .filter((item) => item.isAvailable)
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 3)
    );

    /**
     * Три самых новых товара по `createdAt`.
     *
     * Недоступные товары остаются в подборке, но их кнопка покупки выключена.
     */
    protected readonly newestItems = computed<IShopItem[]>(() =>
        [...this.items()]
            .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
            .slice(0, 3)
    );

    /**
     * Выбирает раздел витрины; выбор синхронизирует чипы и список в панели.
     *
     * @param key Ключ раздела, пустая строка — «Все».
     */
    protected selectSection(key: string): void {
        this.selectedSection.set(key);
    }

    /**
     * Проверяет, выбран ли раздел.
     *
     * @param key Ключ раздела, пустая строка — «Все».
     * @returns `true`, если раздел выбран.
     */
    protected isSectionActive(key: string): boolean {
        return this.selectedSection() === key;
    }

    /**
     * Число товаров в разделе.
     *
     * @param key Ключ раздела.
     * @returns Количество товаров раздела.
     */
    protected countFor(key: string): number {
        return this.sectionCounts().get(key) ?? 0;
    }

    /**
     * Покупка товара.
     *
     * @param _item Товар, который покупатель выбрал.
     */
    protected buy(_item: IShopItem): void {
        // ПРОТОТИП: покупка не подключена
    }

    /**
     * Пополнение баланса.
     */
    protected topUp(): void {
        // ПРОТОТИП: пополнение не подключено
    }
}