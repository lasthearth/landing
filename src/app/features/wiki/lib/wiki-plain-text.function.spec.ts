import { plainWikiText } from './wiki-plain-text.function';

describe('plainWikiText', () => {
    it('снимает заголовки и выделение', () => {
        expect(plainWikiText('## Мост\n\n**важно**')).toBe('Мост важно');
    });

    it('оставляет подпись ссылки на статью', () => {
        expect(plainWikiText('см. [[most|Мост]]')).toBe('см. Мост');
    });

    it('оставляет адрес ссылки без подписи', () => {
        expect(plainWikiText('см. [[most]]')).toBe('см. most');
    });

    it('выбрасывает картинки и блоки кода', () => {
        expect(plainWikiText('![схема](img.png)\n\n```\nкод\n```')).toBe('');
    });

    it('приводит переносы и разделители к одной строке', () => {
        expect(plainWikiText('А\n\n---\n\nБ')).toBe('А Б');
    });
});
