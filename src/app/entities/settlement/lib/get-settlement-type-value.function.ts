import { SETTLEMENT_TYPE, SettlementTypeValue } from './settlement-type.constant';

/**
 * Имена типов надела из API и их значения из {@link SETTLEMENT_TYPE}.
 */
const TYPE_BY_NAME: Readonly<Record<string, SettlementTypeValue>> = {
    CAMP: SETTLEMENT_TYPE.camp,
    VILLAGE: SETTLEMENT_TYPE.village,
    TOWNSHIP: SETTLEMENT_TYPE.township,
    CITY: SETTLEMENT_TYPE.city,
    PROVINCE: SETTLEMENT_TYPE.province,
    GUILD: SETTLEMENT_TYPE.guild,
};

/**
 * Все значения {@link SETTLEMENT_TYPE}, чтобы отличать число сервера от произвольного.
 */
const KNOWN_VALUES: readonly number[] = Object.values(SETTLEMENT_TYPE);

/**
 * Приводит тип надела из ответа API к значению перечисления сервера.
 *
 * Gateway отдаёт тип именем (`'CAMP'`), но поле в DTO объявлено как
 * `string | number`, поэтому число тоже разбирается — по шкале сервера
 * (`CAMP = 1`), а не по индексам форм. Неизвестное имя, число вне шкалы
 * и пустое значение дают {@link SETTLEMENT_TYPE.unspecified}.
 *
 * @param type Тип надела из ответа API.
 * @returns Значение из {@link SETTLEMENT_TYPE}.
 */
export function getSettlementTypeValue(type: string | number | undefined | null): SettlementTypeValue {
    if (typeof type === 'number') {
        return KNOWN_VALUES.includes(type) ? (type as SettlementTypeValue) : SETTLEMENT_TYPE.unspecified;
    }

    if (typeof type !== 'string') {
        return SETTLEMENT_TYPE.unspecified;
    }

    return TYPE_BY_NAME[type] ?? SETTLEMENT_TYPE.unspecified;
}
