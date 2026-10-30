import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Возвращает наименования типа селения по его ключу.
 *
 * Ключ — значение поля `type` из ответа API: имя перечисления (`'CAMP'`)
 * или его число (`SETTLEMENT_TYPE.camp`). Разбирает оба вида
 * {@link getSettlementTypeValue}, шкала одна — серверная.
 *
 * @param key Ключ-типа селения (строка или число из enum).
 */
export function getSettlementTypeByKey(
    key: string | number | undefined
): 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция' | 'Гильдия' {
    switch (getSettlementTypeValue(key)) {
        case SETTLEMENT_TYPE.village:
            return 'Деревня';
        case SETTLEMENT_TYPE.township:
            return 'Посёлок';
        case SETTLEMENT_TYPE.city:
            return 'Город';
        case SETTLEMENT_TYPE.province:
            return 'Региональная провинция';
        case SETTLEMENT_TYPE.guild:
            return 'Гильдия';
        case SETTLEMENT_TYPE.camp:
        default:
            return 'Лагерь';
    }
}
