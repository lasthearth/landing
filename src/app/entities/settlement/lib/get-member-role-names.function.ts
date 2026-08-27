import { ISettlement } from '../model/i-settlement';
import { OWNER_ROLE_ID } from './owner-role-id.constant';

/**
 * Возвращает имена ролей члена поселения для показа бейджей.
 *
 * Служебная роль владельца (`owner`) исключается: владелец помечается короной
 * в чипе игрока, а бейдж «owner» дублировал бы её служебным идентификатором.
 * При выключенных ролях (`roles_enabled === false`) роли не применяются,
 * поэтому список пуст.
 *
 * Несуществующий `role_id` в `role_ids` игнорируется: справочник `roles`
 * приходит в том же ответе, но может отставать после удаления роли.
 *
 * ВНИМАНИЕ (XSS): сервер не экранирует `role.name` — выводить только через `{{ }}`.
 *
 * @param settlement Поселение (справочник `roles` и флаг `roles_enabled`).
 * @param userId Идентификатор члена поселения.
 * @returns Массив имён ролей без служебной роли владельца.
 */
export function getMemberRoleNames(settlement: ISettlement, userId: string): string[] {
    if (settlement.roles_enabled === false) {
        return [];
    }

    const member = (settlement.members ?? []).find((m) => m.user_id === userId);
    const roleIds = (member?.role_ids ?? []).filter((id) => id !== OWNER_ROLE_ID);
    const roles = settlement.roles ?? [];

    return roleIds
        .map((id) => roles.find((role) => role.id === id)?.name)
        .filter((name): name is string => !!name);
}
