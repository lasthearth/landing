import { ISettlement } from '../model/i-settlement';
import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { isGuildSettlement } from './is-guild-settlement.function';
import { MAX_SETTLEMENT_TIER, SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Возвращает уровень (tier) селения от 1 до 5.
 *
 * Лагерь — 1, региональная провинция — {@link MAX_SETTLEMENT_TIER}. Гильдия вне
 * шкалы уровней: она не растёт по типам, поэтому для неё возвращается 0.
 * Ступень совпадает со значением типа надела в API, неизвестный тип
 * считается лагерем.
 *
 * @param settlement Селение.
 * @returns Уровень селения 1..5 или 0 для гильдии.
 */
export function getSettlementTier(settlement: ISettlement): number {
    if (isGuildSettlement(settlement)) {
        return 0;
    }

    const type = getSettlementTypeValue(settlement.type);

    return type >= SETTLEMENT_TYPE.camp && type <= MAX_SETTLEMENT_TIER ? type : SETTLEMENT_TYPE.camp;
}
