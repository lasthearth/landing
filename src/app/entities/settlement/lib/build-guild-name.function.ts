import { GUILD_MARKER } from './guild-marker.constant';

/**
 * Формирует сырое название гильдии с маркером для хранения на бэкенде.
 *
 * @param name Отображаемое название гильдии.
 * @returns Название с префиксом-маркером.
 */
export function buildGuildName(name: string): string {
    return `${GUILD_MARKER} ${name.trimStart()}`;
}
