import { getSettlementTypeValue } from './get-settlement-type-value.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

describe('getSettlementTypeValue', () => {
    it('разбирает имена типов из ответа API по серверной шкале', () => {
        expect(getSettlementTypeValue('CAMP')).toBe(SETTLEMENT_TYPE.camp);
        expect(getSettlementTypeValue('VILLAGE')).toBe(SETTLEMENT_TYPE.village);
        expect(getSettlementTypeValue('TOWNSHIP')).toBe(SETTLEMENT_TYPE.township);
        expect(getSettlementTypeValue('CITY')).toBe(SETTLEMENT_TYPE.city);
        expect(getSettlementTypeValue('PROVINCE')).toBe(SETTLEMENT_TYPE.province);
        expect(getSettlementTypeValue('GUILD')).toBe(SETTLEMENT_TYPE.guild);
    });

    it('принимает число сервера: лагерь — 1, а не 0', () => {
        expect(getSettlementTypeValue(1)).toBe(SETTLEMENT_TYPE.camp);
        expect(getSettlementTypeValue(SETTLEMENT_TYPE.province)).toBe(SETTLEMENT_TYPE.province);
        expect(getSettlementTypeValue(SETTLEMENT_TYPE.guild)).toBe(SETTLEMENT_TYPE.guild);
    });

    it('даёт unspecified для нуля, чужого числа, неизвестного имени и пустого значения', () => {
        expect(getSettlementTypeValue(0)).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue(7)).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue(-1)).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue('FORTRESS')).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue('camp')).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue(undefined)).toBe(SETTLEMENT_TYPE.unspecified);
        expect(getSettlementTypeValue(null)).toBe(SETTLEMENT_TYPE.unspecified);
    });
});
