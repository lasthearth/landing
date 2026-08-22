import { ISettlement } from '../model/i-settlement';
import { SettlementBadgeTone } from '../model/settlement-badge-tone';
import { isGuildSettlement } from './is-guild-settlement.function';

/**
 * Возвращает тон бейджа типа селения.
 *
 * Цвет соответствует tier селения, чтобы визуально отличать
 * Лагерь, Деревню, Посёлок, Город и Региональную провинцию.
 *
 * @param settlement Селение.
 * @returns Тон бейджа.
 */
export function getSettlementTypeTone(settlement: ISettlement): SettlementBadgeTone {
    if (isGuildSettlement(settlement)) {
        return 'line';
    }

    switch (settlement.type) {
        case 'VILLAGE':
        case 1:
            return 'line';
        case 'TOWNSHIP':
        case 2:
            return 'iron';
        case 'CITY':
        case 3:
            return 'silver';
        case 'PROVINCE':
        case 4:
            return 'medal';
        case 'CAMP':
        case 0:
        default:
            return 'leader';
    }
}
