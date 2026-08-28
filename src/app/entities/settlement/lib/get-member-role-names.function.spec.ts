import { ISettlement } from '../model/i-settlement';
import { Permission } from '../model/permission';
import { getMemberRoleNames } from './get-member-role-names.function';
import { OWNER_ROLE_ID } from './owner-role-id.constant';

/**
 * Собирает поселение для проверок бейджей ролей.
 *
 * @param overrides Переопределяемые поля поселения.
 * @returns Поселение с минимально достаточным набором полей.
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

describe('getMemberRoleNames', () => {
    it('возвращает имена ролей участника', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-1', 'r-2'] }],
            roles: [
                { id: 'r-1', name: 'Дозорный', permissions: [Permission.InviteMember] },
                { id: 'r-2', name: 'Кладовщик', permissions: [] },
            ],
        });

        expect(getMemberRoleNames(settlement, 'member-1')).toEqual(['Дозорный', 'Кладовщик']);
    });

    it('не показывает служебную роль владельца в бейджах', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'owner-1', role_ids: [OWNER_ROLE_ID, 'r-1'] }],
            roles: [
                { id: OWNER_ROLE_ID, name: 'owner', permissions: [] },
                { id: 'r-1', name: 'Дозорный', permissions: [] },
            ],
        });

        expect(getMemberRoleNames(settlement, 'owner-1')).toEqual(['Дозорный']);
    });

    it('при roles_enabled=false не показывает ролей вовсе', () => {
        const settlement = makeSettlement({
            roles_enabled: false,
            members: [{ user_id: 'member-1', role_ids: ['r-1'] }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [] }],
        });

        expect(getMemberRoleNames(settlement, 'member-1')).toEqual([]);
    });

    it('пропускает несуществующий role_id и не падает', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-missing', 'r-1'] }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [] }],
        });

        expect(getMemberRoleNames(settlement, 'member-1')).toEqual(['Дозорный']);
    });

    it('возвращает пустой список для пользователя вне поселения', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-1'] }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [] }],
        });

        expect(getMemberRoleNames(settlement, 'stranger')).toEqual([]);
    });

    it('возвращает пустой список, если справочник ролей не пришёл', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-1'] }],
        });

        expect(getMemberRoleNames(settlement, 'member-1')).toEqual([]);
    });
});
