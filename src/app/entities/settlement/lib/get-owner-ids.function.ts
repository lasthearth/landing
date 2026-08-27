import { ISettlement } from '../model/i-settlement';
import { OWNER_ROLE_ID } from './owner-role-id.constant';

/**
 * Возвращает идентификаторы пользователей-владельцев (owner) поселения.
 * Owner — член, у которого `role_ids` содержит `"owner"`. Их может быть несколько.
 *
 * @param settlement Поселение.
 * @returns Массив `user_id` владельцев.
 */
export function getOwnerIds(settlement: ISettlement): string[] {
    return (settlement.members ?? [])
        .filter((member) => member.role_ids?.includes(OWNER_ROLE_ID))
        .map((member) => member.user_id);
}
