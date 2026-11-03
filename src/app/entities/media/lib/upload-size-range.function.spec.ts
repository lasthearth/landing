import { getUploadSizeRange } from './upload-size-range.function';

/**
 * Кодирует политику в base64 так же, как бэкенд заполняет поле `policy`.
 *
 * @param policy Объект политики S3 либо готовая строка для поля `policy`.
 * @returns Base64-строка.
 */
function encodePolicy(policy: unknown): string {
    if (typeof policy === 'string') {
        return policy;
    }

    const bytes = new TextEncoder().encode(JSON.stringify(policy));

    return btoa(String.fromCharCode(...bytes));
}

/**
 * Собирает поля формы presigned-цели.
 *
 * @param policy Объект политики S3 либо готовая строка для поля `policy`.
 * @returns Поля формы с `key`, `policy` и `signature`.
 */
function makeFields(policy: unknown): Record<string, string> {
    return {
        key: 'settlement/9f2c/image.webp',
        policy: encodePolicy(policy),
        signature: 'sig-1',
    };
}

describe('getUploadSizeRange', () => {
    it('разбирает кортеж S3 в точные байты: 1..5 MiB', () => {
        const range = getUploadSizeRange(
            makeFields({
                expiration: '2026-01-01T00:00:00Z',
                conditions: [
                    { bucket: 'last-hearth' },
                    ['starts-with', '$key', 'settlement/'],
                    ['content-length-range', 1048576, 5242880],
                ],
            })
        );

        expect(range).toEqual({ min: 1048576, max: 5242880 });
    });

    it('разбирает объектную форму условия внутри conditions', () => {
        const range = getUploadSizeRange(makeFields({ conditions: [{ 'content-length-range': [2048, 4096] }] }));

        expect(range).toEqual({ min: 2048, max: 4096 });
    });

    it('разбирает условие на верхнем уровне политики', () => {
        const range = getUploadSizeRange(makeFields({ 'content-length-range': [1, 5242880] }));

        expect(range).toEqual({ min: 1, max: 5242880 });
    });

    it('разбирает base64url-вариант поля policy', () => {
        const range = getUploadSizeRange(
            makeFields(
                encodePolicy({ conditions: [['content-length-range', 1048576, 5242880]] })
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '')
            )
        );

        expect(range).toEqual({ min: 1048576, max: 5242880 });
    });

    it('даёт null, если условия размера в политике нет', () => {
        const range = getUploadSizeRange(
            makeFields({
                conditions: [{ bucket: 'last-hearth' }, ['starts-with', '$Content-Type', 'image/']],
            })
        );

        expect(range).toBeNull();
    });

    it('даёт null для нечисловых границ', () => {
        expect(
            getUploadSizeRange(makeFields({ conditions: [['content-length-range', '1048576', '5242880']] }))
        ).toBeNull();
        expect(getUploadSizeRange(makeFields({ conditions: [['content-length-range', 1048576]] }))).toBeNull();
    });

    it('даёт null, если поле policy отсутствует или пустое', () => {
        expect(getUploadSizeRange({ key: 'k', signature: 'sig-1' })).toBeNull();
        expect(getUploadSizeRange(makeFields(''))).toBeNull();
    });

    it('даёт null для битого base64 и битого JSON', () => {
        expect(getUploadSizeRange(makeFields('@@@ не base64 @@@'))).toBeNull();
        expect(getUploadSizeRange(makeFields(encodePolicy('{ conditions: [ [')))).toBeNull();
    });

    it('даёт null, если политика — не объект и conditions — не массив', () => {
        expect(getUploadSizeRange(makeFields(encodePolicy([['content-length-range', 1, 2]])))).toBeNull();
        expect(getUploadSizeRange(makeFields({ conditions: 'content-length-range 1 2' }))).toBeNull();
    });
});
