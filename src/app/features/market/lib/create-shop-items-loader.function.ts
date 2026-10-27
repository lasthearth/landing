import { ChangeDetectorRef, Signal, signal } from '@angular/core';
import { EMPTY, Subscription, catchError } from 'rxjs';
import { DonateService, IShopItem } from '@entities/donate';

/**
 * Загрузчик списка товаров магазина для вкладки.
 *
 * Держит признаки загрузки и сбоя и команду повторной попытки,
 * чтобы три вкладки магазина не дублировали одну и ту же обвязку потока.
 */
export interface ShopItemsLoader {
    /**
     * Признак того, что запрос ещё выполняется.
     */
    readonly loading: Signal<boolean>;

    /**
     * Признак сбоя запроса.
     *
     * Пустой список ошибкой не считается: это нормальное состояние витрины.
     */
    readonly error: Signal<boolean>;

    /**
     * Запрашивает список товаров.
     */
    load(): void;

    /**
     * Повторяет запрос после сбоя.
     */
    retry(): void;

    /**
     * Снимает подписку; вызывать в `ngOnDestroy` компонента.
     */
    destroy(): void;
}

/**
 * Создаёт загрузчик списка товаров магазина.
 *
 * Читает поток `DonateService.getShopItemsOrThrow$()`: он не подменяет сбой
 * пустым списком и не показывает алерт, поэтому вкладка сама решает, что показать.
 * Значение — список товаров, возможно пустой; сбой — ошибка потока.
 * Кэш сервиса сбрасывается на ошибке (`resetOnError`), так что повторная подписка
 * делает новый запрос.
 *
 * @param donateService Сервис донат-магазина.
 * @param changeDetectorRef Сервис явного обнаружения изменений компонента.
 * @param onItems Обработчик полученного списка товаров.
 * @returns Загрузчик с сигналами состояния.
 */
export function createShopItemsLoader(
    donateService: DonateService,
    changeDetectorRef: ChangeDetectorRef,
    onItems: (items: IShopItem[]) => void
): ShopItemsLoader {
    const loading = signal(true);
    const error = signal(false);

    let subscription: Subscription | null = null;

    const load = (): void => {
        subscription?.unsubscribe();
        loading.set(true);
        error.set(false);

        subscription = donateService
            .getShopItemsOrThrow$()
            .pipe(
                catchError(() => {
                    error.set(true);
                    loading.set(false);
                    changeDetectorRef.markForCheck();

                    return EMPTY;
                })
            )
            .subscribe((items) => {
                onItems(items);
                loading.set(false);
                changeDetectorRef.markForCheck();
            });
    };

    const retry = (): void => {
        // Кэш уже сброшен ошибкой, но явный сброс гарантирует новый запрос
        // и в случае, когда поток завершился без значения.
        donateService.refreshShopItems$();
        load();
    };

    const destroy = (): void => {
        subscription?.unsubscribe();
        subscription = null;
    };

    return { loading, error, load, retry, destroy };
}
