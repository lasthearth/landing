import { NICKNAME_ADMIN_LIMITS } from '../config/nickname-admin-limits.constant';

/**
 * Применяет маску игрового ника: вырезает символы вне `A-Za-z0-9_-`
 * и обрезает длину до 15.
 *
 * @param raw Введённое значение.
 * @returns Значение, приведённое к маске ника.
 */
export function sanitizeNickname(raw: string): string {
    return raw.replace(NICKNAME_ADMIN_LIMITS.forbiddenChars, '').slice(0, NICKNAME_ADMIN_LIMITS.nicknameMaxLength);
}
