import { IShopItemDto, IShopItem } from './shop-item.interface';
import { IPurchaseDto, IPurchase } from './purchase.interface';
import { ITransactionDto, ITransaction } from './transaction.interface';
import { IBalanceResponseDto, IBalanceResponse } from './balance-response.interface';

/**
 * Преобразует строковую дату в объект Date.
 *
 * Возвращает `null` для отсутствующих дат, нулевых значений protobuf
 * ("0001-01-01T00:00:00Z") и невалидных строк.
 *
 * @param rawDate Исходная строка даты в формате ISO 8601.
 * @returns Объект Date или `null`.
 */
function parseDate(rawDate: string | undefined): Date | null {
    if (!rawDate) {
        return null;
    }

    if (rawDate.startsWith('0001-01-01') || rawDate === '0001-01-01T00:00:00Z') {
        return null;
    }

    const parsed = new Date(rawDate);

    return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Форматирует дату в локальный формат.
 *
 * @param date Объект Date.
 * @returns Строка в формате "DD.MM.YY - HH:mm".
 */
function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

/**
 * Форматирует дату с fallback на "—".
 *
 * @param rawDate Исходная строка даты.
 * @returns Строка в формате "DD.MM.YY - HH:mm" или "—".
 */
function formatDateOrFallback(rawDate: string | undefined): string {
    const date = parseDate(rawDate);

    return date ? formatDate(date) : '—';
}

/**
 * Преобразует DTO товара магазина в UI-модель.
 *
 * @param dto DTO товара от API.
 * @returns UI-модель товара.
 */
export function mapDtoToShopItem(dto: IShopItemDto): IShopItem {
    const createdAt = parseDate(dto.created_at);
    const updatedAt = parseDate(dto.updated_at);

    return {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.image_url,
        price: dto.price,
        isAvailable: dto.is_available,
        createdAt,
        formattedCreatedAt: createdAt ? formatDate(createdAt) : '—',
        updatedAt,
        formattedUpdatedAt: updatedAt ? formatDate(updatedAt) : '—',
        code: dto.code,
    };
}

/**
 * Преобразует DTO покупки в UI-модель.
 *
 * @param dto DTO покупки от API.
 * @returns UI-модель покупки.
 */
export function mapDtoToPurchase(dto: IPurchaseDto): IPurchase {
    const createdAt = parseDate(dto.created_at);

    return {
        id: dto.id,
        playerId: dto.player_id,
        itemId: dto.item_id ?? '',
        itemName: dto.item_name ?? '',
        price: dto.price ?? '',
        status: dto.status ?? '',
        createdAt,
        formattedDate: createdAt ? formatDate(createdAt) : '—',
    };
}

/**
 * Преобразует DTO транзакции в UI-модель.
 *
 * @param dto DTO транзакции от API.
 * @returns UI-модель транзакции.
 */
export function mapDtoToTransaction(dto: ITransactionDto): ITransaction {
    const createdAt = parseDate(dto.created_at);

    return {
        id: dto.id,
        playerId: dto.player_id,
        amount: dto.amount,
        type: dto.type.toUpperCase(),
        reason: dto.reason,
        purchaseId: dto.purchase_id ?? '',
        createdAt,
        formattedDate: createdAt ? formatDate(createdAt) : '—',
    };
}

/**
 * Преобразует DTO ответа баланса в UI-модель.
 *
 * @param dto DTO ответа баланса от API.
 * @returns UI-модель баланса.
 */
export function mapDtoToBalanceResponse(dto: IBalanceResponseDto): IBalanceResponse {
    return {
        coins: dto.coins,
        playerId: dto.player_id ?? '',
    };
}
