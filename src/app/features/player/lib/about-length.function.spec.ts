import { aboutLength } from './about-length.function';

describe('aboutLength', () => {
    it('пустой текст — ноль символов и строк', () => {
        expect(aboutLength('')).toEqual({ symbols: 0, lines: 0 });
    });

    it('считает кириллицу по символам', () => {
        expect(aboutLength('Играю в шахте').symbols).toBe(13);
    });

    it('эмодзи считается за один символ', () => {
        expect(aboutLength('😀😀').symbols).toBe(2);
    });

    it('одна строка без переводов', () => {
        expect(aboutLength('Играю по вечерам').lines).toBe(1);
    });

    it('считает строки и при переводах Windows', () => {
        expect(aboutLength('раз\r\nдва\nтри').lines).toBe(3);
    });
});
