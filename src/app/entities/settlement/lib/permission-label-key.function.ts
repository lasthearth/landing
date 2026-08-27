import { Permission } from '../model/permission';

/**
 * Возвращает ключ перевода названия права.
 *
 * Право называется тем, чем управляет человек («Приглашать игроков»),
 * а не идентификатором enum — идентификатор в интерфейсе не показывается.
 *
 * @param permission Право члена поселения.
 * @returns Ключ перевода из ветки `settlements.roles.permissions.*`.
 */
export function permissionLabelKey(permission: Permission): string {
    switch (permission) {
        case Permission.InviteMember:
            return 'settlements.roles.permissions.inviteMember';
        case Permission.ReviewJoinRequest:
            return 'settlements.roles.permissions.reviewJoinRequest';
        default:
            return 'settlements.roles.permissions.unknown';
    }
}
