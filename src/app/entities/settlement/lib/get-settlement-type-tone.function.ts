import { ISettlement } from '../model/i-settlement';
import { SettlementBadgeTone } from '../model/settlement-badge-tone';
import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { isGuildSettlement } from './is-guild-settlement.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

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

    switch (getSettlementTypeValue(settlement.type)) {
        case SETTLEMENT_TYPE.village:
            return 'line';
        case SETTLEMENT_TYPE.township:
            return 'iron';
        case SETTLEMENT_TYPE.city:
            return 'silver';
        case SETTLEMENT_TYPE.province:
            return 'medal';
        case SETTLEMENT_TYPE.camp:
        default:
            return 'leader';
    }
}
