import { GUILD_MARKER } from './guild-marker.constant';

/**
 * Проверяет, содержит ли сырое название надела маркер гильдии.
 *
 * @param name Название надела, как оно хранится на бэкенде.
 * @returns true, если название начинается с маркера гильдии.
 */
export function isGuildName(name: string): boolean {
    return name.startsWith(GUILD_MARKER);
}
