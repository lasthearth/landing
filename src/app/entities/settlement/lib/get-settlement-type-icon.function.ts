import { ISettlement } from '../model/i-settlement';
import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { isGuildSettlement } from './is-guild-settlement.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Возвращает иконку Taiga UI для типа селения.
 *
 * Иконка — второй, независимый от цвета признак уровня: цветовая
 * дифференциация уровней сама по себе недоступна дальтоникам, а
 * `tent` / `house` / `building` / `castle` читаются в любом случае.
 *
 * @param settlement Селение.
 * @returns Имя иконки вида `@tui.house`.
 */
export function getSettlementTypeIcon(settlement: ISettlement): string {
    if (isGuildSettlement(settlement)) {
        return '@tui.handshake';
    }

    switch (getSettlementTypeValue(settlement.type)) {
        case SETTLEMENT_TYPE.village:
            return '@tui.house';
        case SETTLEMENT_TYPE.township:
            return '@tui.building';
        case SETTLEMENT_TYPE.city:
            return '@tui.building-2';
        case SETTLEMENT_TYPE.province:
            return '@tui.castle';
        case SETTLEMENT_TYPE.camp:
        default:
            return '@tui.tent';
    }
}
