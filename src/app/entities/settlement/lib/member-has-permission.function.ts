import { ISettlement } from '../model/i-settlement';
import { Permission } from '../model/permission';
import { OWNER_ROLE_ID } from './owner-role-id.constant';

/**
 * Проверяет, есть ли у члена поселения указанное право.
 * Owner (`role_ids` содержит `"owner"`) обладает всеми правами.
 * При `roles_enabled === false` учитывается только статус owner.
 *
 * @param settlement Поселение (нужен справочник `roles` и флаг `roles_enabled`).
 * @param userId Идентификатор пользователя.
 * @param permission Проверяемое право.
 * @returns true, если право есть.
 */
export function memberHasPermission(
    settlement: ISettlement,
    userId: string,
    permission: Permission
): boolean {
    const member = (settlement.members ?? []).find((m) => m.user_id === userId);

    if (!member) {
        return false;
    }

    const roleIds = member.role_ids ?? [];

    if (roleIds.includes(OWNER_ROLE_ID)) {
        return true;
    }

    if (settlement.roles_enabled === false) {
        return false;
    }

    const roles = settlement.roles ?? [];

    return roleIds.some((roleId) =>
        roles.find((role) => role.id === roleId)?.permissions.includes(permission)
    );
}
