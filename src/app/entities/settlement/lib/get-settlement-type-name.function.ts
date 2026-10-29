import { ISettlement } from '../model/i-settlement';
import { getSettlementTypeByKey } from './get-settlement-type-by-key.function';

/**
 * Идентификатор тега «Центральное поселение», который делает надел столицей.
 */
export const CAPITAL_TAG_ID = '6a455f03a601f408b02ef444';

/**
 * Название типа «Столица» (Центр Имперского эксклава).
 */
export const CAPITAL_TYPE_NAME = 'Столица';

/**
 * Возвращает отображаемое название типа надела.
 *
 * Если у надела есть тег столицы, возвращает «Столица» вне зависимости от того,
 * что приходит в поле type (тег главнее).
 *
 * @param settlement Надел.
 * @returns Название типа.
 */
export function getSettlementTypeName(settlement: ISettlement): string {
    const isCapital = settlement.tags.some((tag) => tag.id === CAPITAL_TAG_ID);

    return isCapital ? CAPITAL_TYPE_NAME : getSettlementTypeByKey(settlement.type);
}
