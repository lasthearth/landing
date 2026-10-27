/**
 * Публичный API сущности "Донат".
 *
 * Экспортирует типы, мапперы и API-сервис для работы
 * с донат-валютой, магазином, историей транзакций
 * и ожидающими выдачи покупками.
 */

export * from './model/shop-item.interface';
export * from './model/ability-item.interface';
export * from './model/shop-section.constant';
export * from './model/purchase.interface';
export * from './model/purchases-page.interface';
export * from './model/pending-purchase-dto.interface';
export * from './model/pending-purchase.interface';
export {
    mapDtoToKitEntry,
    mapDtoToAbilityItem,
    mapDtoToShopItem,
    mapDtoToPurchase,
    mapDtoToTransaction,
    mapDtoToBalanceResponse,
    normalizeShopCategory,
    // Помощники дат экспортируются для повторного использования в других
    // слайсах entities (например, `@entities/kitdef`): формат "DD.MM.YY - HH:mm"
    // и правило нулевой даты protobuf должны остаться в одном месте.
    parseDate,
    formatDate,
    formatDateOrFallback,
} from './model/donate.mapper';
export { mapDtoToPendingPurchase } from './model/pending-purchase.mapper';
export * from './model/transaction.interface';
export * from './model/balance-response.interface';
export { DonateService } from './api/donate.service';
