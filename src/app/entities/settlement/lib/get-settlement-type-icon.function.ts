import { ISettlement } from '../model/i-settlement';
import { isGuildSettlement } from './is-guild-settlement.function';

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

    switch (settlement.type) {
        case 'VILLAGE':
        case 1:
            return '@tui.house';
        case 'TOWNSHIP':
        case 2:
            return '@tui.building';
        case 'CITY':
        case 3:
            return '@tui.building-2';
        case 'PROVINCE':
        case 4:
            return '@tui.castle';
        case 'CAMP':
        case 0:
        default:
            return '@tui.tent';
    }
}
