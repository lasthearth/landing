import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { AmountPipe, TranslatePipe } from '@core/i18n';
import { DonateService, IBalanceResponse, IShopItem, IShopSection, SHOP_SECTIONS } from '@entities/donate';
import { RevealDirective } from '@shared/lib/directives';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { catchError, Observable, of } from 'rxjs';
import { createShopItemsLoader, ShopItemsLoader } from '../../lib/create-shop-items-loader.function';

/**
 * ПРОТОТИП «Витрина»: страница магазина одной сеткой карточек.
 *
 * Отвечает на вопрос, может ли первый экран быть витриной, где цена
 * висит на изображении, а фильтром служит единственный ряд чипов.
 * Файл одноразовый: маршрута нет, в навигацию страница не входит.
 * Классы `vitrina__*` принадлежат только этому компоненту.
 */
@Component({
    selector: 'app-proto-vitrina',
    imports: [
        AmountPipe,
        AsyncPipe,
        ImageLoaderComponent,
        MarketGridSkeletonComponent,
        RevealDirective,
        TranslatePipe,
    ],
    templateUrl: './proto-vitrina.component.html',
    styleUrl: './proto-vitrina.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoVitrinaComponent implements OnDestroy {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис явного обнаружения изменений.
     */
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    /**
     * Баланс игрока. Сбой запроса гасится в `null`: без баланса шапка
     * остаётся рабочей, а страница не падает на пререндере.
     */
    protected readonly balance$: Observable<IBalanceResponse | null> = this.donateService
        .watchMyBalance$()
        .pipe(catchError(() => of(null)));

    /**
     * Разделы витрины в порядке `SHOP_SECTIONS`.
     */
    protected readonly sections: readonly IShopSection[] = SHOP_SECTIONS;

    /**
     * Выбранный раздел, пустая строка — «Все».
     */
    protected readonly selectedSection = signal('');

    /**
     * Пользователь хотя бы раз переключал фильтр.
     *
     * До первого переключения карточки появляются через `appReveal`;
     * после — только анимацией сетки, иначе на смену раздела наложились бы
     * два механизма появления сразу.
     */
    protected readonly hasSwitched = signal(false);

    /**
     * Список товаров магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

    /**
     * Загрузчик товаров: держит признаки загрузки и сбоя.
     */
    private readonly loader: ShopItemsLoader = createShopItemsLoader(
        this.donateService,
        this.changeDetectorRef,
        (items) => this.items.set(items)
    );

    /**
     * Признак загрузки списка товаров.
     */
    protected readonly loading = this.loader.loading;

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
     * Товары выбранного раздела, для «Все» — весь список.
     */
    protected readonly visibleItems = computed<IShopItem[]>(() => {
        const key = this.selectedSection();

        return key ? this.items().filter((item) => item.section === key) : this.items();
    });

    constructor() {
        this.loader.load();
    }

    /**
     * Снимает подписку на поток товаров.
     */
    public ngOnDestroy(): void {
        this.loader.destroy();
    }

    /**
     * Проверяет, выбран ли раздел.
     *
     * @param key Ключ раздела, пустая строка — «Все».
     * @returns `true`, если раздел выбран.
     */
    protected isSectionSelected(key: string): boolean {
        return this.selectedSection() === key;
    }

    /**
     * Переключает раздел витрины.
     *
     * Повторный клик по активному чипу ничего не делает: сетка не должна
     * пересобираться и заново проигрывать появление.
     *
     * @param key Ключ раздела, пустая строка — «Все».
     */
    protected selectSection(key: string): void {
        if (key === this.selectedSection()) {
            return;
        }

        this.hasSwitched.set(true);
        this.selectedSection.set(key);
    }

    /**
     * ПРОТОТИП: покупка не подключена.
     */
    protected buy(): void {
        // Кнопка существует только чтобы проверить вес и место действия в карточке.
    }

    /**
     * ПРОТОТИП: пополнение не подключено.
     */
    protected topUp(): void {
        // Переход на страницу пополнения появится в рабочей версии.
    }
}