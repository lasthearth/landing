import { IPendingPurchaseDto } from './pending-purchase-dto.interface';
import { IPendingPurchase } from './pending-purchase.interface';
import { formatDate, formatDateOrFallback, parseDate } from './donate.mapper';
import { resolveAvatarUrl } from '@shared/lib/resolve-avatar-url';

/**
 * Преобразует DTO ожидающей выдачи покупки в UI-модель.
 *
 * @param dto DTO покупки от API.
 * @returns UI-модель ожидающей покупки.
 */
export function mapDtoToPendingPurchase(dto: IPendingPurchaseDto): IPendingPurchase {
    const createdAt = parseDate(dto.created_at);

    return {
        id: dto.id,
        playerId: dto.player_id,
        playerName: dto.player_name ?? '—',
        playerAvatarUrl: resolveAvatarUrl(dto.player_avatar_url),
        itemId: dto.item_id ?? '',
        itemName: dto.item_name ?? '—',
        pricePaid: dto.price_paid ?? '',
        basePrice: dto.base_price ?? '',
        discountPercent: dto.discount_percent ?? 0,
        issuedBy: dto.issued_by ?? '',
        comment: dto.comment ?? '',
        status: dto.status ?? '',
        createdAt,
        formattedDate: createdAt ? formatDate(createdAt) : formatDateOrFallback(dto.created_at),
    };
}
