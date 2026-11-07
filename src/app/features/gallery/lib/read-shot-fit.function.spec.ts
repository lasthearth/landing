import { FRAME_RATIO, MAX_DISCARD, MAX_RATIO, MIN_RATIO, readShotDiscard, readShotFit } from './read-shot-fit.function';

describe('readShotFit', () => {
    it('кадр 16:9 заполняет раму без остатка', () => {
        expect(readShotFit(1920, 1080)).toBe('cover');
        expect(readShotDiscard(1920, 1080)).toBeCloseTo(0, 6);
    });

    it('кадр 4:3 и 21:9 заполняют раму, теряя меньше трети', () => {
        expect(readShotFit(1440, 1080)).toBe('cover');
        expect(readShotDiscard(1440, 1080)).toBeLessThan(MAX_DISCARD);
        expect(readShotFit(2560, 1080)).toBe('cover');
        expect(readShotDiscard(2560, 1080)).toBeLessThan(MAX_DISCARD);
    });

    it('квадратный кадр показывается целиком: cover отнял бы 44% высоты', () => {
        expect(readShotFit(1000, 1000)).toBe('contain');
        expect(readShotDiscard(1000, 1000)).toBeCloseTo(1 - 1 / FRAME_RATIO, 6);
    });

    it('портрет 800×1067 показывается целиком, а не режется на 58%', () => {
        // Кадр из канала от 5 ноября 2026: пропорция ровно 0.75, старая полоса
        // 0.75…1.9 держала его в `cover` и теряла 58% высоты.
        expect(readShotFit(800, 1067)).toBe('contain');
        expect(readShotDiscard(800, 1067)).toBeGreaterThan(0.55);
    });

    it('телефонный кадр 9:19 показывается целиком, а не обрезается', () => {
        expect(readShotFit(1080, 1920)).toBe('contain');
    });

    it('полоска 12:1 показывается целиком', () => {
        expect(readShotFit(269, 21)).toBe('contain');
    });

    it('без размеров берёт пропорцию рамы 16:9', () => {
        expect(readShotFit(undefined, undefined)).toBe('cover');
        expect(readShotFit(0, 1080)).toBe('cover');
        expect(readShotFit(1920, 0)).toBe('cover');
        expect(readShotDiscard(undefined, undefined)).toBe(0);
    });

    it('границы полосы выведены из потери и совпадают с ней', () => {
        expect(MIN_RATIO).toBeCloseTo(FRAME_RATIO * (1 - MAX_DISCARD), 9);
        expect(MAX_RATIO).toBeCloseTo(FRAME_RATIO / (1 - MAX_DISCARD), 9);

        // Целые пиксели у границы: округление вверх для узкой и вниз для широкой
        // стороны держит кадр внутри допустимой потери.
        const narrow = Math.ceil(MIN_RATIO * 1000);
        const wide = Math.floor(MAX_RATIO * 1000);

        expect(readShotFit(narrow, 1000)).toBe('cover');
        expect(readShotFit(narrow - 1, 1000)).toBe('contain');
        expect(readShotFit(wide, 1000)).toBe('cover');
        expect(readShotFit(wide + 1, 1000)).toBe('contain');
    });

    it('возвращает только два значения на всём диапазоне пропорций', () => {
        const fits = new Set(
            [0.05, 0.3, 0.75, 1, 1.18, 1.5, 1.9, 2.6, 3, 12].map((ratio) => readShotFit(Math.round(ratio * 1000), 1000))
        );

        expect([...fits].sort()).toEqual(['contain', 'cover']);
    });

    it('потеря растёт по мере удаления пропорции от рамы в обе стороны', () => {
        // Пропорции идут от рамы наружу, поэтому потеря обязана расти.
        const narrower = [1.7, 1.5, 1.4, 1.25].map((r) => readShotDiscard(Math.round(r * 1000), 1000));
        const wider = [1.9, 2.1, 2.4, 2.6].map((r) => readShotDiscard(Math.round(r * 1000), 1000));

        expect(narrower).toEqual([...narrower].sort((a, b) => a - b));
        expect(wider).toEqual([...wider].sort((a, b) => a - b));
        expect(narrower.every((d) => d >= 0 && d <= 1)).toBe(true);
    });
});
