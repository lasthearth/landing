import { ISettlement } from '../model/i-settlement';
import { GUILD_MARKER } from './guild-marker.constant';

/**
 * Возвращает отображаемое название поселения без скрытого маркера гильдии.
 *
 * @param value Поселение или сырое название.
 * @returns Название, очищенное от маркера гильдии.
 */
export function getSettlementDisplayName(value: ISettlement | string): string {
    const name = typeof value === 'string' ? value : value.name;

    if (!name.startsWith(GUILD_MARKER)) {
        return name;
    }

    return name.slice(GUILD_MARKER.length).trimStart();
}
