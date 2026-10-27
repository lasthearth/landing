import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import {
    BehaviorSubject,
    EMPTY,
    Observable,
    ReplaySubject,
    Subject,
    catchError,
    map,
    of,
    share,
    startWith,
    switchMap,
    take,
} from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { IShopItemDto, ICreateShopItemRequest, IUpdateShopItemRequest } from '../model/shop-item.interface';
import { IPurchaseDto } from '../model/purchase.interface';
import { IPendingPurchaseDto } from '../model/pending-purchase-dto.interface';
import { ITransactionDto } from '../model/transaction.interface';
import { IBalanceResponseDto } from '../model/balance-response.interface';
import {
    mapDtoToShopItem,
    mapDtoToPurchase,
    mapDtoToTransaction,
    mapDtoToBalanceResponse,
} from '../model/donate.mapper';
import { mapDtoToPendingPurchase } from '../model/pending-purchase.mapper';
import { IShopItem } from '../model/shop-item.interface';
import { IPurchase } from '../model/purchase.interface';
import { IPendingPurchase } from '../model/pending-purchase.interface';
import { IPurchasesPage } from '../model/purchases-page.interface';
import { ITransaction } from '../model/transaction.interface';
import { IBalanceResponse } from '../model/balance-response.interface';

/**
 * API-сервис для работы с донат-валютой и магазином.
 *
 * Предоставляет методы для получения баланса, списка товаров,
 * совершения покупок, просмотра истории и администрирования.
 *
 * Авторизация для защищённых эндпоинтов выполняется
 * автоматически через authInterceptor.
 */
@Injectable({
    providedIn: 'root',
})
export class DonateService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Триггер запроса списка товаров.
     *
     * `BehaviorSubject` нужен, чтобы первый подписчик сразу запустил запрос:
     * обычный `Subject` не дал бы значения до первого `next()`.
     */
    private readonly shopItemsRefresh$ = new BehaviorSubject<void>(undefined);

    /**
     * Признак того, что список товаров уже запрошен или запрашивается.
     *
     * Защищает прогрев кэша от второго запроса, если магазин открыли раньше,
     * чем браузер освободился.
     */
    private shopItemsRequested = false;

    /**
     * Кэшированный Observable со списком товаров магазина.
     *
     * Товары редко меняются, поэтому успех запоминается на всю сессию
     * (`share` с `ReplaySubject(1)`): следующие подписчики запрос не делают.
     * Ошибка кэш сбрасывает (`resetOnError`), чтобы подписчик получил новый
     * запрос, а не запомненный сбой; `shareReplay(1)` здесь неприменим —
     * он закэшировал бы сам сбой.
     * При вызове {@link refreshShopItems$} кэш сбрасывается и выполняется новый запрос.
     *
     * Запрос всегда уходит с `SKIP_ERROR_ALERT`: без него `errorInterceptor`
     * подменил бы сбой GET на `EMPTY`, и подписчик не увидел бы ни ошибки,
     * ни значений — скелетон загрузки остался бы висеть. Подмену сбоя пустым
     * списком делает {@link getShopItems$}, а не этот поток, поэтому
     * {@link getShopItemsOrThrow$} получает ошибку как есть.
     */
    private readonly shopItems$ = this.shopItemsRefresh$.pipe(
        switchMap(() => {
            this.shopItemsRequested = true;

            return this.http
                .get<{ items: IShopItemDto[] }>(`${this.baseUrl}/donate/shop/items`, {
                    context: new HttpContext().set(SKIP_ERROR_ALERT, true),
                })
                .pipe(map((response) => response.items.map(mapDtoToShopItem)));
        }),
        share<IShopItem[]>({
            connector: () => new ReplaySubject<IShopItem[]>(1),
            resetOnError: true,
            resetOnComplete: false,
            resetOnRefCountZero: false,
        })
    );

    /**
     * Сигнал «баланс изменился» (покупка за осколки вне магазина).
     */
    private readonly balanceChanged = new Subject<void>();

    /**
     * Сообщает, что баланс изменился: шапка и профиль перечитают его.
     */
    public notifyBalanceChanged(): void {
        this.balanceChanged.next();
    }

    /**
     * Текущий баланс, перечитываемый при каждом изменении.
     *
     * @returns Observable с балансом.
     */
    public watchMyBalance$(): Observable<IBalanceResponse> {
        return this.balanceChanged.pipe(
            startWith(undefined),
            switchMap(() => this.getMyBalance$())
        );
    }

    /**
     * Получает текущий баланс донат-валюты авторизованного игрока.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), баланс просто не отрисуется.
     *
     * @returns Observable с балансом.
     */
    public getMyBalance$(): Observable<IBalanceResponse> {
        return this.http
            .get<IBalanceResponseDto>(`${this.baseUrl}/donate/me/balance`, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map(mapDtoToBalanceResponse));
    }

    /**
     * Получает текущий баланс донат-валюты указанного игрока.
     *
     * @param playerId Идентификатор игрока.
     * @returns Observable с балансом.
     */
    public getPlayerBalance$(playerId: string): Observable<IBalanceResponse> {
        return this.http
            .get<IBalanceResponseDto>(`${this.baseUrl}/donate/players/${playerId}/balance`)
            .pipe(map(mapDtoToBalanceResponse));
    }

    /**
     * Получает историю покупок авторизованного игрока.
     *
     * Вспомогательный запрос: при ошибке алерт не показывается
     * (`SKIP_ERROR_ALERT`), список покупок скрывается молча.
     *
     * @returns Observable с массивом покупок.
     */
    public getMyPurchases$(): Observable<IPurchase[]> {
        return this.http
            .get<{ purchases: IPurchaseDto[] }>(`${this.baseUrl}/donate/me/purchases`, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((response) => response.purchases.map(mapDtoToPurchase)));
    }

    /**
     * Получает список товаров магазина, деградируя к пустому списку при сбое.
     *
     * Результат кэшируется на всю сессию: повторная подписка запрос не делает.
     * Сбой не доходит до подписчика и не показывает алерт: поток выдаёт пустой
     * массив. Подходит витрине, где «товаров нет» допустимо показать вместо
     * ошибки. Там, где сбой нужно отличить от пустого магазина, берут
     * {@link getShopItemsOrThrow$}.
     *
     * @returns Observable с массивом товаров; при сбое — пустой массив.
     */
    public getShopItems$(): Observable<IShopItem[]> {
        return this.shopItems$.pipe(catchError(() => of([])));
    }

    /**
     * Получает список товаров магазина, пробрасывая сбой подписчику.
     *
     * Тот же кэш на сессию, что и у {@link getShopItems$}: повторная подписка
     * запрос не делает. Отличие — ошибка доходит до подписчика, поэтому
     * компонент сам рисует состояние ошибки и повтор. Общий алерт не
     * показывается (`SKIP_ERROR_ALERT`): сообщение и кнопку повтора рисует
     * вызывающий код. Кэш сбой не запоминает (`resetOnError`), так что
     * следующая подписка после ошибки делает новый запрос.
     *
     * @returns Observable с массивом товаров; при сбое — ошибка.
     */
    public getShopItemsOrThrow$(): Observable<IShopItem[]> {
        return this.shopItems$;
    }

    /**
     * Прогревает кэш списка товаров одним запросом.
     *
     * Назначение — заранее, до открытия страницы магазина, получить данные,
     * которые пререндер в HTML не кладёт. Отличие от {@link getShopItems$}:
     * при сбое поток завершается без значения и не подменяет ошибку пустым
     * списком, поэтому в кэше не остаётся «товаров нет». Если товары уже
     * запрошены, нового запроса не делает.
     *
     * @returns Observable со списком товаров; при ошибке завершается без значения.
     */
    public prefetchShopItems$(): Observable<IShopItem[]> {
        if (!this.shopItemsRequested) {
            this.shopItemsRefresh$.next(undefined);
        }

        return this.shopItems$.pipe(
            take(1),
            catchError(() => EMPTY)
        );
    }

    /**
     * Сбрасывает кэш списка товаров и инициирует новый запрос к API.
     *
     * Подписчики, использующие {@link getShopItems$} или
     * {@link getShopItemsOrThrow$}, автоматически получат актуальный список.
     */
    public refreshShopItems$(): void {
        this.shopItemsRefresh$.next(undefined);
    }

    /**
     * Триггер запроса полного списка товаров для админки.
     */
    private readonly adminShopItemsRefresh$ = new BehaviorSubject<void>(undefined);

    /**
     * Кэшированный Observable с полным списком товаров магазина.
     *
     * Публичный {@link getShopItems$} отдаёт только доступные записи, поэтому
     * скрытый товар исчезал и из админки: его нельзя было найти, чтобы снова
     * опубликовать. Здесь список полный, каждый товар несёт `is_available`
     * и `category`. Семантика кэша та же, что и у {@link getShopItemsOrThrow$}:
     * успех запоминается на сессию, сбой кэш сбрасывает и доходит до
     * подписчика, общий алерт не показывается.
     */
    private readonly adminShopItems$ = this.adminShopItemsRefresh$.pipe(
        switchMap(() =>
            this.http
                .get<{ items: IShopItemDto[] }>(`${this.baseUrl}/donate/admin/shop/items`, {
                    context: new HttpContext().set(SKIP_ERROR_ALERT, true),
                })
                .pipe(map((response) => response.items.map(mapDtoToShopItem)))
        ),
        share<IShopItem[]>({
            connector: () => new ReplaySubject<IShopItem[]>(1),
            resetOnError: true,
            resetOnComplete: false,
            resetOnRefCountZero: false,
        })
    );

    /**
     * Получает полный список товаров магазина, включая скрытые.
     *
     * ⚠️ Требует права `donate:shop:update`: 401 без токена и 403 без права.
     * Ошибка не показывает общий алерт и не подменяется пустым списком — она
     * доходит до подписчика, поэтому состояние ошибки и кнопку повтора рисует
     * вызывающий код. Результат кэшируется на сессию: повторная подписка
     * запрос не делает, перечитывание запускает {@link refreshAdminShopItems$}.
     *
     * Публичный список витрины {@link getShopItems$} этот метод не заменяет:
     * витрине скрытые товары не нужны.
     *
     * @returns Observable с массивом товаров; при сбое — ошибка.
     */
    public getAdminShopItems$(): Observable<IShopItem[]> {
        return this.adminShopItems$;
    }

    /**
     * Сбрасывает кэш полного списка товаров и инициирует новый запрос.
     *
     * Подписчики {@link getAdminShopItems$} автоматически получат актуальный
     * список. Вызывают после создания, обновления или удаления товара.
     */
    public refreshAdminShopItems$(): void {
        this.adminShopItemsRefresh$.next(undefined);
    }

    /**
     * Получает товар магазина по идентификатору.
     *
     * @param id Идентификатор товара.
     * @returns Observable с товаром.
     */
    public getShopItemById$(id: string): Observable<IShopItem> {
        return this.http
            .get<IShopItemDto>(`${this.baseUrl}/donate/shop/items/${id}`)
            .pipe(map(mapDtoToShopItem));
    }

    /**
     * Покупает товар по идентификатору.
     *
     * @param itemId Идентификатор товара для покупки.
     * @returns Observable с результатом операции.
     */
    public buyItem$(itemId: string): Observable<unknown> {
        return this.http.post<unknown>(`${this.baseUrl}/donate/shop/items/${itemId}:buy`, {});
    }

    /**
     * Начисляет донат-валюту игроку.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param playerId Идентификатор игрока.
     * @param amount Сумма для начисления (decimal as string).
     * @returns Observable с результатом операции.
     */
    public addCoins$(playerId: string, amount: string, playerName: string, reason?: string): Observable<unknown> {
        return this.http.post<unknown>(
            `${this.baseUrl}/donate/players/${playerId}/coins:add`,
            { player_id: playerId, player_name: playerName, amount, ...(reason ? { reason } : {}) }
        );
    }

    /**
     * Списывает донат-валюту у игрока.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param playerId Идентификатор игрока.
     * @param amount Сумма для списания (decimal as string).
     * @returns Observable с результатом операции.
     */
    public deductCoins$(playerId: string, amount: string, reason?: string): Observable<unknown> {
        return this.http.post<unknown>(
            `${this.baseUrl}/donate/players/${playerId}/coins:deduct`,
            { player_id: playerId, amount, ...(reason ? { reason } : {}) }
        );
    }

    /**
     * Получает историю покупок конкретного игрока.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param playerId Идентификатор игрока.
     * @returns Observable с массивом покупок.
     */
    public getPlayerPurchases$(playerId: string): Observable<IPurchase[]> {
        return this.http
            .get<{ purchases: IPurchaseDto[] }>(
                `${this.baseUrl}/donate/players/${playerId}/purchases`
            )
            .pipe(map((response) => response.purchases.map(mapDtoToPurchase)));
    }

    /**
     * Получает историю транзакций конкретного игрока.
     *
     * @param playerId Идентификатор игрока.
     * @returns Observable с массивом транзакций.
     */
    public getPlayerTransactions$(playerId: string): Observable<ITransaction[]> {
        return this.http
            .get<{ transactions: ITransactionDto[] }>(
                `${this.baseUrl}/donate/players/${playerId}/transactions`
            )
            .pipe(map((response) => response.transactions.map(mapDtoToTransaction)));
    }

    /**
     * Оформляет возврат покупки.
     *
     * @param purchaseId Идентификатор покупки для возврата.
     * @returns Observable с результатом операции.
     */
    public refundPurchase$(purchaseId: string): Observable<unknown> {
        return this.http.post<unknown>(
            `${this.baseUrl}/donate/purchases/${purchaseId}:refund`,
            {}
        );
    }

    /**
     * Получает список покупок, ожидающих выдачи.
     *
     * ⚠️ Требуются права администратора.
     *
     * @returns Observable с массивом ожидающих покупок.
     */
    public getPendingPurchases$(): Observable<IPendingPurchase[]> {
        return this.http
            .get<{ purchases: IPendingPurchaseDto[] }>(`${this.baseUrl}/donate/purchases/pending`)
            .pipe(map((response) => response.purchases.map(mapDtoToPendingPurchase)));
    }

    /**
     * Получает историю покупок всех игроков (сначала новые).
     *
     * Использует cursor-пагинацию: для получения следующей страницы
     * нужно передать `pageToken` из ответа предыдущей.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param limit Максимальное количество покупок на странице.
     * @param pageToken Токен следующей страницы из предыдущего ответа.
     * @returns Observable со страницей покупок.
     */
    public getAllPurchases$(limit: number = 20, pageToken?: string): Observable<IPurchasesPage> {
        let params = new HttpParams().set('limit', limit);

        if (pageToken) {
            params = params.set('page_token', pageToken);
        }

        return this.http
            .get<{ purchases?: IPurchaseDto[]; next_page_token?: string }>(
                `${this.baseUrl}/donate/purchases`,
                { params }
            )
            .pipe(
                map((response) => ({
                    purchases: (response.purchases ?? []).map(mapDtoToPurchase),
                    nextPageToken: response.next_page_token ?? '',
                }))
            );
    }

    /**
     * Отмечает покупку как выданную.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param purchaseId Идентификатор покупки.
     * @returns Observable с результатом операции.
     */
    public markPurchaseIssued$(purchaseId: string): Observable<unknown> {
        return this.http.post<unknown>(
            `${this.baseUrl}/donate/purchases/${purchaseId}:mark-issued`,
            {}
        );
    }

    /**
     * Создаёт товар в донат-магазине.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param request Данные для создания товара.
     * @returns Observable с созданным товаром.
     */
    public createShopItem$(request: ICreateShopItemRequest): Observable<IShopItem> {
        return this.http
            .post<{ item: IShopItemDto }>(`${this.baseUrl}/donate/shop/items`, request)
            .pipe(map((response) => mapDtoToShopItem(response.item)));
    }

    /**
     * Обновляет товар в донат-магазине.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param id Идентификатор товара.
     * @param request Данные для обновления товара.
     * @returns Observable с обновлённым товаром.
     */
    public updateShopItem$(id: string, request: IUpdateShopItemRequest): Observable<IShopItem> {
        return this.http
            .put<{ item: IShopItemDto }>(`${this.baseUrl}/donate/shop/items/${id}`, request)
            .pipe(map((response) => mapDtoToShopItem(response.item)));
    }

    /**
     * Удаляет товар из донат-магазина.
     *
     * ⚠️ Требуются права администратора.
     *
     * @param id Идентификатор товара.
     * @returns Observable с пустым результатом.
     */
    public deleteShopItem$(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/donate/shop/items/${id}`);
    }
}
