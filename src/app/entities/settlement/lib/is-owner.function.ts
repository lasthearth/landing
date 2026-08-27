import { ISettlement } from '../model/i-settlement';
import { getOwnerIds } from './get-owner-ids.function';

/**
 * Проверяет, является ли пользователь владельцем (owner) поселения.
 *
 * @param settlement Поселение.
 * @param userId Идентификатор пользователя.
 * @returns true, если пользователь — owner.
 */
export function isOwner(settlement: ISettlement, userId: string): boolean {
    return getOwnerIds(settlement).includes(userId);
}
