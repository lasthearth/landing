import { ISettlement } from '../model/i-settlement';
import { getSettlementTier } from './get-settlement-tier.function';
import { GUILD_MARKER } from './guild-marker.constant';
import { MAX_SETTLEMENT_TIER, SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Собирает надел для проверок ступени.
 *
 * @param overrides Переопределяемые поля надела.
 * @returns Надел с минимально достаточным набором полей.
 */
function makeSettlement(overrides: Partial<ISettlement>): ISettlement {
    return {
        id: 's-1',
        type: 'CAMP',
        name: 'Тестовое',
        description: '',
        members: [],
        diplomacy: 'Миролюбивый',
        coordinates: { x: 0, y: 0 },
        tags: [{ id: 't-1' }],
        attachments: [],
        created_at: '0',
        updated_at: '0',
        ...overrides,
    };
}

describe('getSettlementTier', () => {
    it('считает ступень по серверной шкале типов: лагерь 1, провинция 5', () => {
        expect(getSettlementTier(makeSettlement({ type: 'CAMP' }))).toBe(1);
        expect(getSettlementTier(makeSettlement({ type: 'VILLAGE' }))).toBe(2);
        expect(getSettlementTier(makeSettlement({ type: 'TOWNSHIP' }))).toBe(3);
        expect(getSettlementTier(makeSettlement({ type: 'CITY' }))).toBe(4);
        expect(getSettlementTier(makeSettlement({ type: 'PROVINCE' }))).toBe(MAX_SETTLEMENT_TIER);
    });

    it('принимает число из API: лагерь — 1, а не 0', () => {
        expect(getSettlementTier(makeSettlement({ type: SETTLEMENT_TYPE.camp }))).toBe(1);
        expect(getSettlementTier(makeSettlement({ type: SETTLEMENT_TYPE.city }))).toBe(4);
    });

    it('даёт 0 для гильдии — по типу и по старому маркеру в названии', () => {
        expect(getSettlementTier(makeSettlement({ type: 'GUILD', name: 'Купцы' }))).toBe(0);
        expect(getSettlementTier(makeSettlement({ type: 'CAMP', name: `${GUILD_MARKER} Купцы` }))).toBe(0);
    });

    it('считает неизвестный тип лагерем', () => {
        expect(getSettlementTier(makeSettlement({ type: 'FORTRESS' }))).toBe(1);
        expect(getSettlementTier(makeSettlement({ type: undefined as unknown as string }))).toBe(1);
    });
});
