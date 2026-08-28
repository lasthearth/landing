import { ISettlement } from '../model/i-settlement';
import { Permission } from '../model/permission';
import { memberHasPermission } from './member-has-permission.function';
import { OWNER_ROLE_ID } from './owner-role-id.constant';

/**
 * Собирает поселение для проверок прав.
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

describe('memberHasPermission', () => {
    it('выдаёт владельцу все права независимо от справочника ролей', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'owner-1', role_ids: [OWNER_ROLE_ID] }],
            roles: [],
        });

        expect(memberHasPermission(settlement, 'owner-1', Permission.InviteMember)).toBeTrue();
        expect(memberHasPermission(settlement, 'owner-1', Permission.ReviewJoinRequest)).toBeTrue();
    });

    it('при roles_enabled=false оставляет права только владельцу', () => {
        const settlement = makeSettlement({
            roles_enabled: false,
            members: [
                { user_id: 'owner-1', role_ids: [OWNER_ROLE_ID] },
                { user_id: 'member-1', role_ids: ['r-1'] },
            ],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [Permission.InviteMember] }],
        });

        expect(memberHasPermission(settlement, 'owner-1', Permission.InviteMember)).toBeTrue();
        expect(memberHasPermission(settlement, 'member-1', Permission.InviteMember)).toBeFalse();
    });

    it('не выдаёт прав пользователю, который не состоит в поселении', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-1'] }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [Permission.InviteMember] }],
        });

        expect(memberHasPermission(settlement, 'stranger', Permission.InviteMember)).toBeFalse();
    });

    it('игнорирует несуществующий role_id и не падает', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-missing', 'r-1'] }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [Permission.ReviewJoinRequest] }],
        });

        expect(memberHasPermission(settlement, 'member-1', Permission.ReviewJoinRequest)).toBeTrue();
        expect(memberHasPermission(settlement, 'member-1', Permission.InviteMember)).toBeFalse();
    });

    it('выдаёт право, если его даёт хотя бы одна из ролей участника', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1', role_ids: ['r-1', 'r-2'] }],
            roles: [
                { id: 'r-1', name: 'Кладовщик', permissions: [] },
                { id: 'r-2', name: 'Вербовщик', permissions: [Permission.InviteMember] },
            ],
        });

        expect(memberHasPermission(settlement, 'member-1', Permission.InviteMember)).toBeTrue();
    });

    it('не выдаёт прав участнику без ролей', () => {
        const settlement = makeSettlement({
            members: [{ user_id: 'member-1' }],
            roles: [{ id: 'r-1', name: 'Дозорный', permissions: [Permission.InviteMember] }],
        });

        expect(memberHasPermission(settlement, 'member-1', Permission.InviteMember)).toBeFalse();
    });
});
