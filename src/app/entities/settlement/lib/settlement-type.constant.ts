/**
 * Тип надела в ответах API — proto-перечисление `SettlementType`
 * (`vsservice/proto/settlement/v1/settlement.proto`).
 *
 * Шкала сервера, не фронтовая: `CAMP = 1`, а ноль — `SETTLEMENT_TYPE_UNSPECIFIED`.
 * Gateway сериализует перечисления именами (`UseEnumNumbers` не включён), поэтому
 * в `Settlement.type` приходит строка; числа здесь — для кода, который держит
 * значение перечисления сам (диалог основания и повышения уровня).
 */
export const SETTLEMENT_TYPE = {
    /** Тип не задан. В диалоге основания означает «надела ещё нет». */
    unspecified: 0,

    /** Лагерь (стан). */
    camp: 1,

    /** Деревня. */
    village: 2,

    /** Посёлок. */
    township: 3,

    /** Город. */
    city: 4,

    /** Региональная провинция. Верхняя ступень: выше неё повышения нет. */
    province: 5,

    /** Гильдия. Единственная ступень своего рода, не повышается. */
    guild: 6,
} as const;

/**
 * Значение типа надела: число из {@link SETTLEMENT_TYPE}.
 */
export type SettlementTypeValue = (typeof SETTLEMENT_TYPE)[keyof typeof SETTLEMENT_TYPE];

/**
 * Верхняя ступень шкалы уровней надела.
 */
export const MAX_SETTLEMENT_TIER = 5;
