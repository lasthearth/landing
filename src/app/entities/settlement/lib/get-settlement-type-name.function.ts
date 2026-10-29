import { ISettlement } from '../model/i-settlement';
import { getSettlementTypeByKey } from './get-settlement-type-by-key.function';

/**
 * Название тега, который делает надел столицей (приоритетнее type).
 */
export const CAPITAL_TAG_NAME = 'центральное поселение';

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
 * @param getTagName Резолвер имени тега по id (например, store.getTagById).
 * @returns Название типа.
 */
export function getSettlementTypeName(
    settlement: ISettlement,
    getTagName: (tagId: string) => string | undefined
): string {
    const isCapital = settlement.tags.some((tag) => getTagName(tag.id) === CAPITAL_TAG_NAME);

    return isCapital ? CAPITAL_TYPE_NAME : getSettlementTypeByKey(settlement.type);
}
