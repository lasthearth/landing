import { ISettlement } from '../model/i-settlement';
import { isGuildSettlement } from './is-guild-settlement.function';

/**
 * Возвращает уровень (tier) селения от 1 до 5.
 *
 * Лагерь — 1, региональная провинция — 5. Гильдия вне шкалы уровней:
 * она не растёт по типам, поэтому для неё возвращается 0.
 *
 * @param settlement Селение.
 * @returns Уровень селения 1..5 или 0 для гильдии.
 */
export function getSettlementTier(settlement: ISettlement): number {
    if (isGuildSettlement(settlement)) {
        return 0;
    }

    switch (settlement.type) {
        case 'VILLAGE':
        case 1:
            return 2;
        case 'TOWNSHIP':
        case 2:
            return 3;
        case 'CITY':
        case 3:
            return 4;
        case 'PROVINCE':
        case 4:
            return 5;
        case 'CAMP':
        case 0:
        default:
            return 1;
    }
}
