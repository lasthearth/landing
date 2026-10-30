import { ISettlement } from '../model/i-settlement';
import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { GUILD_MARKER } from './guild-marker.constant';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Проверяет, является ли надел гильдией.
 *
 * Признак — тип надела `GUILD` из ответа API. Маркер `[GUILD]` в названии
 * остался у гильдий, созданных до появления типа на бэкенде, поэтому он
 * тоже считается признаком.
 *
 * @param settlement Объект надела.
 * @returns true, если надел — гильдия.
 */
export function isGuildSettlement(settlement: ISettlement): boolean {
    return (
        getSettlementTypeValue(settlement.type) === SETTLEMENT_TYPE.guild || settlement.name.startsWith(GUILD_MARKER)
    );
}
