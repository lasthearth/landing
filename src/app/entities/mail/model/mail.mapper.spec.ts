import { mapAttachmentDto, mapMailDto, mapMailListDto } from './mail.mapper';

describe('маппер почты', () => {
    it('различает вложения oneof по заполненному полю', () => {
        expect(mapAttachmentDto({ item: { game_code: 'game:bread', quantity: 5, type: 'item' } })).toEqual({
            kind: 'item',
            gameCode: 'game:bread',
            quantity: '5',
            itemType: 'item',
            amount: '',
        });
        expect(mapAttachmentDto({ coins: { amount: '3000' } })).toEqual({
            kind: 'coins',
            gameCode: '',
            quantity: '',
            itemType: 'item',
            amount: '3000',
        });
    });

    it('пустой тип позиции читает как предмет', () => {
        expect(mapAttachmentDto({ item: { game_code: 'game:coal', quantity: 1 } }).itemType).toBe('item');
    });

    it('сохраняет claimed_count строкой', () => {
        expect(mapMailDto({ id: 'm1', claimed_count: '9007199254740993' }).claimedCount).toBe('9007199254740993');
    });

    it('отсутствующий claimed_count читает как ноль', () => {
        expect(mapMailDto({ id: 'm1' }).claimedCount).toBe('0');
    });

    it('переводит даты в Date, а нулевой protobuf-срок оставляет пустым', () => {
        const mail = mapMailDto({
            id: 'm1',
            created_at: '2026-11-20T10:00:00Z',
            expires_at: '0001-01-01T00:00:00Z',
        });

        expect(mail.createdAt?.toISOString()).toBe('2026-11-20T10:00:00.000Z');
        expect(mail.expiresAt).toBeNull();
    });

    it('читает признак отзыва и broadcast', () => {
        const mail = mapMailDto({ id: 'm1', revoked: true, broadcast: true });

        expect(mail.revoked).toBe(true);
        expect(mail.broadcast).toBe(true);
    });

    it('страница без писем даёт пустой список и пустой курсор', () => {
        expect(mapMailListDto({})).toEqual({ mails: [], nextPageToken: '' });
    });

    it('страница переносит курсор следующей страницы', () => {
        expect(mapMailListDto({ mails: [{ id: 'm1' }], next_page_token: 'cursor' }).nextPageToken).toBe('cursor');
    });
});