import { ComposeMailDraft } from '../model/compose-mail-draft.interface';
import { buildComposeMailRequest } from './build-compose-mail-request.function';

/**
 * Собирает черновик письма с значениями по умолчанию.
 *
 * @param patch Поля, которые проверяет конкретный тест.
 * @returns Черновик письма.
 */
function draft(patch: Partial<ComposeMailDraft>): ComposeMailDraft {
    return {
        userId: null,
        broadcast: false,
        title: '',
        body: '',
        attachments: [],
        expiresAt: '',
        idempotencyKey: null,
        ...patch,
    };
}

describe('buildComposeMailRequest', () => {
    it('одному игроку уходит user_id, признака broadcast в теле нет', () => {
        const request = buildComposeMailRequest(draft({ userId: 'logto-sub', title: 'Награда', body: 'За осаду' }));

        expect(request.user_id).toBe('logto-sub');
        expect('broadcast' in request).toBe(false);
    });

    it('рассылка уходит признаком broadcast, без user_id', () => {
        const request = buildComposeMailRequest(draft({ userId: 'logto-sub', broadcast: true }));

        expect(request.broadcast).toBe(true);
        expect('user_id' in request).toBe(false);
    });

    it('обрезает пробелы по краям заголовка, текста и кода позиции', () => {
        const request = buildComposeMailRequest(
            draft({
                title: '  Награда  ',
                body: '\n За осаду \n',
                attachments: [
                    { kind: 'item', gameCode: ' game:bread ', quantity: '5', itemType: 'item', amount: '' },
                ],
            })
        );

        expect(request.title).toBe('Награда');
        expect(request.body).toBe('За осаду');
        expect(request.attachments?.[0].item?.game_code).toBe('game:bread');
    });

    it('позиция уходит элементом item с пустым attr_snapshot', () => {
        const request = buildComposeMailRequest(
            draft({
                attachments: [
                    { kind: 'item', gameCode: 'game:bread', quantity: '5', itemType: 'block', amount: '' },
                ],
            })
        );

        expect(request.attachments).toEqual([
            { item: { game_code: 'game:bread', quantity: 5, type: 'block', attr_snapshot: '' } },
        ]);
    });

    it('осколки уходят элементом coins со строковой суммой', () => {
        const request = buildComposeMailRequest(
            draft({
                attachments: [{ kind: 'coins', gameCode: '', quantity: '', itemType: 'item', amount: '3000' }],
            })
        );

        expect(request.attachments).toEqual([{ coins: { amount: '3000' } }]);
    });

    it('порядок вложений повторяет порядок строк формы', () => {
        const request = buildComposeMailRequest(
            draft({
                attachments: [
                    { kind: 'coins', gameCode: '', quantity: '', itemType: 'item', amount: '10' },
                    { kind: 'item', gameCode: 'game:coal', quantity: '1', itemType: 'block', amount: '' },
                ],
            })
        );

        expect(request.attachments?.map((attachment) => Object.keys(attachment)[0])).toEqual(['coins', 'item']);
    });

    it('срок жизни переводит местное время поля в UTC', () => {
        const request = buildComposeMailRequest(draft({ expiresAt: '2026-12-01T00:00' }));

        expect(request.expires_at).toBe(new Date('2026-12-01T00:00').toISOString());
    });

    it('пустой срок жизни в тело не попадает', () => {
        const request = buildComposeMailRequest(draft({ expiresAt: '   ' }));

        expect('expires_at' in request).toBe(false);
    });

    it('ключ идемпотентности передаётся, когда он есть', () => {
        const withKey = buildComposeMailRequest(draft({ idempotencyKey: 'uuid-v4' }));
        const withoutKey = buildComposeMailRequest(draft({ idempotencyKey: null }));

        expect(withKey.idempotency_key).toBe('uuid-v4');
        expect('idempotency_key' in withoutKey).toBe(false);
    });
});