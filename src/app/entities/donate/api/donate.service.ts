import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { IShopItemDto, ICreateShopItemRequest, IUpdateShopItemRequest } from '../model/shop-item.interface';
import { IPurchaseDto } from '../model/purchase.interface';
import { ITransactionDto } from '../model/transaction.interface';
import { IBalanceResponseDto } from '../model/balance-response.interface';
import {
    mapDtoToShopItem,
    mapDtoToPurchase,
    mapDtoToTransaction,
    mapDtoToBalanceResponse,
} from '../model/donate.mapper';
import { IShopItem } from '../model/shop-item.interface';
import { IPurchase } from '../model/purchase.interface';
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
     * Кэшированный Observable со списком товаров магазина.
     *
     * Товары редко меняются, поэтому используется shareReplay(1)
     * для предотвращения лишних запросов.
     */
    private readonly shopItems$ = this.http
        .get<{ items: IShopItemDto[] }>(`${this.baseUrl}/donate/shop/items`)
        .pipe(
            map((response) => response.items.map(mapDtoToShopItem)),
            catchError(() => of([])),
            shareReplay(1)
        );

    /**
     * Получает текущий баланс донат-валюты авторизованного игрока.
     *
     * @returns Observable с балансом.
     */
    public getMyBalance$(): Observable<IBalanceResponse> {
        return this.http
            .get<IBalanceResponseDto>(`${this.baseUrl}/donate/me/balance`)
            .pipe(map(mapDtoToBalanceResponse));
    }

    /**
     * Получает историю покупок авторизованного игрока.
     *
     * @returns Observable с массивом покупок.
     */
    public getMyPurchases$(): Observable<IPurchase[]> {
        return this.http
            .get<{ purchases: IPurchaseDto[] }>(`${this.baseUrl}/donate/me/purchases`)
            .pipe(map((response) => response.purchases.map(mapDtoToPurchase)));
    }

    /**
     * Получает список товаров магазина.
     *
     * Результат кэшируется через shareReplay(1).
     *
     * @returns Observable с массивом товаров.
     */
    public getShopItems$(): Observable<IShopItem[]> {
        return this.shopItems$;
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
