import { occupancyShare } from './occupancy-share.function';

describe('occupancyShare', () => {
    it('нет ответа сервера — ноль', () => {
        expect(occupancyShare(null)).toBe(0);
    });

    it('обычный онлайн — настоящая доля', () => {
        expect(occupancyShare({ online: 21, max_online: 75 })).toBeCloseTo(0.28, 5);
        expect(occupancyShare({ online: 0, max_online: 75 })).toBe(0);
    });

    it('предел нулевой или мусорный — ноль, а не Infinity и не NaN', () => {
        expect(occupancyShare({ online: 5, max_online: 0 })).toBe(0);
        expect(occupancyShare({ online: 5, max_online: -10 })).toBe(0);
        expect(occupancyShare({ online: 5, max_online: Number.NaN })).toBe(0);
    });

    it('переполнение и мусор в текущем значении не ломают линию', () => {
        expect(occupancyShare({ online: 90, max_online: 75 })).toBe(1);
        expect(occupancyShare({ online: -3, max_online: 75 })).toBe(0);
        expect(occupancyShare({ online: Number.NaN, max_online: 75 })).toBe(0);
    });
});
