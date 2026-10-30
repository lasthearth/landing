import { ISettlement } from '../model/i-settlement';
import { GUILD_MARKER } from './guild-marker.constant';
import { isGuildSettlement } from './is-guild-settlement.function';
import { SETTLEMENT_TYPE } from './settlement-type.constant';

/**
 * Собирает надел для проверок типа.
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

describe('isGuildSettlement', () => {
    it('признаёт гильдией надел с типом GUILD из API', () => {
        expect(isGuildSettlement(makeSettlement({ type: 'GUILD', name: 'Купцы' }))).toBeTrue();
        expect(isGuildSettlement(makeSettlement({ type: SETTLEMENT_TYPE.guild, name: 'Купцы' }))).toBeTrue();
    });

    it('признаёт гильдией старый надел с маркером в названии', () => {
        expect(isGuildSettlement(makeSettlement({ type: 'CAMP', name: `${GUILD_MARKER} Купцы` }))).toBeTrue();
    });

    it('не считает гильдией надел других ступеней', () => {
        expect(isGuildSettlement(makeSettlement({ type: 'CAMP' }))).toBeFalse();
        expect(isGuildSettlement(makeSettlement({ type: 'PROVINCE' }))).toBeFalse();
        expect(isGuildSettlement(makeSettlement({ type: SETTLEMENT_TYPE.camp }))).toBeFalse();
    });
});
