import { ISettlement } from '../model/i-settlement';
import { SettlementMembership } from '../model/settlement-membership';
import { getOwnerIds } from './get-owner-ids.function';

/**
 * Собирает карту «игрок → поселение и роль» по всем поселениям за один проход.
 *
 * Списки игроков и профили показывают поселение и роль каждому в своём списке:
 * без карты на каждого игрока приходился бы поиск по всем поселениям.
 * Главы ставятся в карту первыми и жителями не перезаписываются.
 *
 * @param settlements Поселения сервера.
 * @returns Карта по идентификатору пользователя.
 */
export function buildSettlementMembers(
    settlements: readonly ISettlement[]
): ReadonlyMap<string, SettlementMembership> {
    const members = new Map<string, SettlementMembership>();

    for (const settlement of settlements) {
        for (const userId of getOwnerIds(settlement)) {
            members.set(userId, { settlement, role: 'leader' });
        }
    }

    for (const settlement of settlements) {
        for (const member of settlement.members ?? []) {
            if (member.user_id && !members.has(member.user_id)) {
                members.set(member.user_id, { settlement, role: 'resident' });
            }
        }
    }

    return members;
}
