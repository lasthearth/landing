/**
 * Публичный API сущности "Донат".
 *
 * Экспортирует типы, мапперы и API-сервис для работы
 * с донат-валютой, магазином, историей транзакций
 * и ожидающими выдачи покупками.
 */

export * from './model/shop-item.interface';
export * from './model/purchase.interface';
export * from './model/pending-purchase-dto.interface';
export * from './model/pending-purchase.interface';
export {
    mapDtoToKitEntry,
    mapDtoToShopItem,
    mapDtoToPurchase,
    mapDtoToTransaction,
    mapDtoToBalanceResponse,
} from './model/donate.mapper';
export { mapDtoToPendingPurchase } from './model/pending-purchase.mapper';
export * from './model/transaction.interface';
export * from './model/balance-response.interface';
export { DonateService } from './api/donate.service';
