import { fileSize } from './file-size.function';

describe('fileSize', () => {
    it('неизвестный размер — null', () => {
        expect(fileSize(0)).toBeNull();
        expect(fileSize(-5)).toBeNull();
    });

    it('меньше мегабайта — целые килобайты, не меньше одного', () => {
        expect(fileSize(655360)).toEqual({ value: 640, unit: 'kb' });
        expect(fileSize(100)).toEqual({ value: 1, unit: 'kb' });
    });

    it('мегабайты — с одной цифрой после запятой', () => {
        expect(fileSize(2202009)).toEqual({ value: 2.1, unit: 'mb' });
        expect(fileSize(18874368)).toEqual({ value: 18, unit: 'mb' });
    });
});
