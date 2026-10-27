import { NICKNAME_ADMIN_LIMITS } from '../config/nickname-admin-limits.constant';

/**
 * Считает дату окончания кулдауна на смену ника.
 *
 * Кулдаун — {@link NICKNAME_ADMIN_LIMITS}.cooldownMonths месяцев от последней
 * смены (`last_nickname_changed_at` из `GET /v1/users/{user_id}`). Если смены
 * не было либо дату не разобрать, кулдауна нет.
 *
 * @param lastChangedAt Дата последней смены ника (ISO 8601) либо `undefined`.
 * @returns Дата окончания кулдауна либо `null`, если кулдауна нет.
 */
export function getNicknameCooldownEnd(lastChangedAt?: string | null): Date | null {
    if (!lastChangedAt || lastChangedAt.startsWith('0001-01-01')) {
        return null;
    }

    const changed = new Date(lastChangedAt);

    if (isNaN(changed.getTime())) {
        return null;
    }

    const end = new Date(changed);
    end.setMonth(end.getMonth() + NICKNAME_ADMIN_LIMITS.cooldownMonths);

    return end;
}
