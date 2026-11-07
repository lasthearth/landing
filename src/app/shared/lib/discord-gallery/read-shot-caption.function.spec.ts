import { readShotCaption } from './read-shot-caption.function';

describe('readShotCaption', () => {
    it('служебное имя файла подписью не считается', () => {
        expect(readShotCaption('image.png')).toBeNull();
        expect(readShotCaption('2026-11-02_23-02-08.png')).toBeNull();
        expect(readShotCaption('57FA6AF5-0A16-4EE3-B24F-C5EABF332EF2.png')).toBeNull();
        expect(readShotCaption('Vintage_Story_13.09.2026_23_33_05.png')).toBeNull();
        expect(readShotCaption('Screenshot_20261010_165202_Instagram.jpg')).toBeNull();
        expect(readShotCaption('https://discord.com/channels/1/2/3')).toBeNull();
    });

    it('подпись игрока возвращается без расширения', () => {
        expect(readShotCaption('какой сорт?')).toBe('какой сорт?');
        expect(readShotCaption('это что за некрополь?')).toBe('это что за некрополь?');
        expect(readShotCaption('топчик')).toBe('топчик');
    });

    it('кириллица без пробела — подпись, латиница без пробела — имя файла', () => {
        expect(readShotCaption('Красивое')).toBe('Красивое');
        expect(readShotCaption('krasivoe')).toBeNull();
    });

    it('снимает разметку Discord и схлопывает пробелы', () => {
        expect(readShotCaption('В ~~цирке~~ суде')).toBe('В цирке суде');
        expect(readShotCaption('**важно**  и   срочно')).toBe('важно и срочно');
        expect(readShotCaption('Есть 3 вещи:\nкак горит огонь')).toBe('Есть 3 вещи: как горит огонь');
    });

    it('длинную подпись укорачивает по границе слова', () => {
        const long = 'Дорогие братья и сестры сегодня мы собрались здесь чтобы отметить радостное событие открытие нашей протестантской церкви и ещё много слов подряд';
        const caption = readShotCaption(long);

        expect(caption).not.toBeNull();
        expect(caption!.length).toBeLessThanOrEqual(141);
        expect(caption!.endsWith('…')).toBe(true);
        expect(caption!.startsWith('Дорогие братья')).toBe(true);
        expect(long.startsWith(caption!.slice(0, -1))).toBe(true);
    });

    it('пустое значение подписи не даёт', () => {
        expect(readShotCaption('')).toBeNull();
        expect(readShotCaption('   ')).toBeNull();
        expect(readShotCaption('.png')).toBeNull();
        expect(readShotCaption(null)).toBeNull();
        expect(readShotCaption(undefined)).toBeNull();
    });
});