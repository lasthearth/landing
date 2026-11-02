import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Возвращает наименования типа селения по его ключу.
 *
 * Ключ — значение поля `type` из ответа API: имя перечисления (`'CAMP'`)
 * или его число (`SETTLEMENT_TYPE.camp`). Разбирает оба вида
 * {@link getSettlementTypeValue}, шкала одна — серверная.
 *
 * Имена — по действующей редакции правил (§2.1 «Типы и статусы»): «Стан»
 * (3+ игрока), «Вотчина», «Баронство», «Графство», «Маркграфство». Нижней
 * ступени «Усадьба» (1–2 игрока) в перечислении нет: на сайте такие наделы
 * не регистрируют, это только `HAMLET` на карте земель.
 *
 * @param key Ключ-типа селения (строка или число из enum).
 */
export function getSettlementTypeByKey(
    key: string | number | undefined
): 'Стан' | 'Вотчина' | 'Баронство' | 'Графство' | 'Маркграфство' | 'Гильдия' {
    switch (getSettlementTypeValue(key)) {
        case SETTLEMENT_TYPE.village:
            return 'Вотчина';
        case SETTLEMENT_TYPE.township:
            return 'Баронство';
        case SETTLEMENT_TYPE.city:
            return 'Графство';
        case SETTLEMENT_TYPE.province:
            return 'Маркграфство';
        case SETTLEMENT_TYPE.guild:
            return 'Гильдия';
        case SETTLEMENT_TYPE.camp:
        default:
            return 'Стан';
    }
}
