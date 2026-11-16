import { AsyncPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, map, Observable, of, Subscription } from 'rxjs';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { DonateService, IShopItem, IShopSection, SHOP_SECTIONS } from '@entities/donate';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RevealDirective } from '@shared/lib/directives';

/**
 * Группа товаров одного раздела витрины.
 */
interface IPraisGroup {
    /**
     * Раздел витрины.
     */
    section: IShopSection;

    /**
     * Товары раздела в порядке ответа API.
     */
    items: IShopItem[];
}

/**
 * Прототип «Прайс»: весь магазин одной страницей, строки как в меню.
 *
 * Отвечает на вопрос, можно ли читать магазин как прайс, где цена
 * и кнопка видны у каждого товара без вкладок и фильтров.
 * Это выбрасываемый прототип: покупка и пополнение не подключены.
 */
@Component({
    selector: 'app-proto-prais',
    imports: [AsyncPipe, AmountPipe, TranslatePipe, TuiIcon, ImageLoaderComponent, RevealDirective],
    templateUrl: './proto-prais.component.html',
    styleUrl: './proto-prais.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoPraisComponent implements OnDestroy {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Документ: якорный переход к разделу без прямого `document`.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Все разделы витрины в порядке `SHOP_SECTIONS`.
     */
    protected readonly sections: readonly IShopSection[] = SHOP_SECTIONS;

    /**
     * Признак незавершённой загрузки товаров.
     */
    protected readonly loading = signal(true);

    /**
     * Товары магазина.
     */
    protected readonly items = signal<IShopItem[]>([]);

    /**
     * Разделы, в которых есть товары: пустой раздел не рисуется.
     */
    protected readonly groups = computed<IPraisGroup[]>(() => {
        const items = this.items();

        return this.sections
            .map((section) => ({ section, items: items.filter((item) => item.section === section.key) }))
            .filter((group) => group.items.length > 0);
    });

    /**
     * Баланс осколков: `null`, пока ответа нет или запрос не удался.
     */
    protected readonly balance$: Observable<string | null> = this.donateService.watchMyBalance$().pipe(
        map((response) => response.coins),
        catchError(() => of(null))
    );

    /**
     * Подписка на список товаров.
     */
    private readonly itemsSubscription: Subscription = this.donateService.getShopItemsOrThrow$().subscribe({
        next: (items) => {
            this.items.set(items);
            this.loading.set(false);
        },
        // ПРОТОТИП: экран ошибки не рисуется, страница остаётся пустой.
        error: () => this.loading.set(false),
    });

    /** @inheritdoc */
    public ngOnDestroy(): void {
        this.itemsSubscription.unsubscribe();
    }

    /**
     * Прокручивает к разделу витрины.
     *
     * @param key Ключ раздела, пустая строка — начало прайса.
     */
    protected scrollToSection(key: string): void {
        const id = key ? `prais-section-${key}` : 'prais-top';

        this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
