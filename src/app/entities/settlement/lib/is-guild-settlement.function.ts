import { ISettlement } from '../model/i-settlement';
import { GUILD_MARKER } from './guild-marker.constant';

/**
 * Проверяет, является ли поселение гильдией по скрытому маркеру в названии.
 *
 * @param settlement Объект поселения.
 * @returns true, если в названии присутствует маркер гильдии.
 */
export function isGuildSettlement(settlement: ISettlement): boolean {
    return settlement.name.startsWith(GUILD_MARKER);
}
