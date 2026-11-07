import { DiscordGalleryImage } from '@shared/lib/discord-gallery/discord-gallery.service';
import {
    readArchiveFacts,
    toFactsSnapshot,
    withFactsSnapshot,
} from './archive-facts.function';

/**
 * Собирает кадр архива с значениями по умолчанию.
 *
 * @param overrides Поля, которые нужно заменить.
 * @returns Кадр архива.
 */
function shot(overrides: Partial<DiscordGalleryImage> = {}): DiscordGalleryImage {
    return {
        id: 'id-1',
        url: 'https://cdn.discordapp.com/attachments/1/2/a.png',
        proxyUrl: 'https://media.discordapp.net/attachments/1/2/a.png',
        alt: 'image.png',
        author: 'player',
        timestamp: '2026-11-03T12:00:00.000Z',
        width: 1920,
        height: 1080,
        ...overrides,
    };
}

describe('readArchiveFacts', () => {
    it('пустой архив даёт нули, а не NaN', () => {
        const facts = readArchiveFacts([], 10);

        expect(facts.total).toBe(0);
        expect(facts.authors).toBe(0);
        expect(facts.months).toBe(0);
        expect(facts.captioned).toBe(0);
        expect(facts.recentMonth).toBe(0);
        expect(facts.firstShot).toBeNull();
        expect(facts.portraitShot).toBeNull();
        expect(facts.topAuthors).toEqual([]);
    });

    it('кадры без читаемой даты не ломают остальные числа', () => {
        const facts = readArchiveFacts(
            [
                shot({ id: 'a', timestamp: 'не дата' }),
                shot({ id: 'b', timestamp: '2026-11-03T12:00:00.000Z' }),
            ],
            10
        );

        expect(facts.total).toBe(2);
        expect(facts.months).toBe(1);
        expect(facts.firstShot?.id).toBe('b');
    });

    it('считает кадры, авторов и подписи игроков', () => {
        const facts = readArchiveFacts(
            [
                shot({ id: 'a', author: 'ann', alt: 'это что за некрополь?' }),
                shot({ id: 'b', author: 'ann', alt: 'image.png' }),
                shot({ id: 'c', author: 'bob', alt: 'топчик' }),
            ],
            10
        );

        expect(facts.total).toBe(3);
        expect(facts.authors).toBe(2);
        expect(facts.captioned).toBe(2);
    });

    it('авторов сортирует по числу кадров, при равенстве — по имени', () => {
        const images = [
            shot({ id: '1', author: 'zoe' }),
            shot({ id: '2', author: 'zoe' }),
            shot({ id: '3', author: 'zoe' }),
            shot({ id: '4', author: 'ann' }),
            shot({ id: '5', author: 'ann' }),
            shot({ id: '6', author: 'bob' }),
            shot({ id: '7', author: 'bob' }),
        ];

        expect(readArchiveFacts(images, 10).topAuthors).toEqual([
            { name: 'zoe', count: 3 },
            { name: 'ann', count: 2 },
            { name: 'bob', count: 2 },
        ]);
    });

    it('список авторов обрезается до запрошенной длины', () => {
        const images = ['a', 'b', 'c', 'd'].map((author, index) => shot({ id: `${index}`, author }));

        expect(readArchiveFacts(images, 2).topAuthors.length).toBe(2);
        expect(readArchiveFacts(images, 2).authors).toBe(4);
    });

    it('первым кадром считает самый старый, а не последний в списке', () => {
        const oldest = shot({ id: 'old', timestamp: '2025-07-02T14:26:00.000Z' });
        const facts = readArchiveFacts(
            [shot({ id: 'new', timestamp: '2026-11-03T12:00:00.000Z' }), oldest],
            10
        );

        expect(facts.firstShot?.id).toBe('old');
    });

    it('месяцы считает по календарной разнице включительно', () => {
        const facts = readArchiveFacts(
            [
                shot({ id: 'a', timestamp: '2025-07-02T14:26:00.000Z' }),
                shot({ id: 'b', timestamp: '2026-11-03T12:00:00.000Z' }),
            ],
            10
        );

        expect(facts.months).toBe(17);
    });

    it('кадры одного месяца дают один месяц, а не ноль', () => {
        const facts = readArchiveFacts(
            [
                shot({ id: 'a', timestamp: '2026-11-01T10:00:00.000Z' }),
                shot({ id: 'b', timestamp: '2026-11-30T10:00:00.000Z' }),
            ],
            10
        );

        expect(facts.months).toBe(1);
    });

    it('последний месяц считает от самого свежего кадра, а не от сегодняшнего дня', () => {
        const newest = '2026-11-03T12:00:00.000Z';
        const facts = readArchiveFacts(
            [
                shot({ id: 'a', timestamp: newest }),
                shot({ id: 'b', timestamp: '2026-10-20T12:00:00.000Z' }),
                shot({ id: 'c', timestamp: '2025-07-02T12:00:00.000Z' }),
            ],
            10
        );

        expect(facts.recentMonth).toBe(2);
    });

    it('печатным портретом берёт вертикальный кадр, ближайший к 4:5', () => {
        const facts = readArchiveFacts(
            [
                shot({ id: 'wide', width: 1920, height: 1080 }),
                shot({ id: 'exact', width: 800, height: 1000 }),
                shot({ id: 'very-tall', width: 1080, height: 1920 }),
            ],
            10
        );

        expect(facts.portraitShot?.id).toBe('exact');
    });

    it('квадрат годится, когда вертикальных кадров нет', () => {
        const facts = readArchiveFacts(
            [shot({ id: 'wide', width: 1920, height: 1080 }), shot({ id: 'square', width: 1000, height: 1000 })],
            10
        );

        expect(facts.portraitShot?.id).toBe('square');
    });

    it('из одних широких кадров печатного портрета нет', () => {
        const facts = readArchiveFacts(
            [shot({ id: 'a', width: 1920, height: 1080 }), shot({ id: 'b', width: 1600, height: 900 })],
            10
        );

        expect(facts.portraitShot).toBeNull();
    });

    it('порядок входа на результат не влияет', () => {
        const images = [
            shot({ id: 'a', author: 'ann', timestamp: '2025-07-02T12:00:00.000Z', alt: 'подпись игрока' }),
            shot({ id: 'b', author: 'bob', timestamp: '2026-11-03T12:00:00.000Z', width: 800, height: 1000 }),
            shot({ id: 'c', author: 'ann', timestamp: '2026-01-15T12:00:00.000Z' }),
        ];

        const forward = readArchiveFacts(images, 10);
        const backward = readArchiveFacts([...images].reverse(), 10);

        expect(backward).toEqual(forward);
    });

    it('снимок хранит числа и дату, но не кадры с адресами', () => {
        const full = readArchiveFacts(
            [
                shot({ id: 'a', timestamp: '2025-07-02T12:00:00.000Z', alt: 'подпись игрока' }),
                shot({ id: 'b', timestamp: '2026-11-03T12:00:00.000Z' }),
                shot({ id: 'c', timestamp: '2026-11-01T12:00:00.000Z' }),
            ],
            2
        );

        const snapshot = toFactsSnapshot(full);

        expect(snapshot).toEqual({
            total: 3,
            authors: 1,
            months: 17,
            captioned: 1,
            recentMonth: 2,
            firstShotDate: '2025-07-02T12:00:00.000Z',
            topAuthors: [{ name: 'player', count: 3 }],
        });
        expect(JSON.stringify(snapshot)).not.toContain('discordapp');
    });

    it('снимок без первого кадра хранит пустую дату', () => {
        const snapshot = toFactsSnapshot(readArchiveFacts([], 10));

        expect(snapshot.firstShotDate).toBeNull();
        expect(snapshot.total).toBe(0);
    });

    it('числа снимка подставляются в живой пересчёт, первый кадр обнуляется', () => {
        const full = readArchiveFacts(
            [
                shot({ id: 'a', author: 'ann', timestamp: '2025-07-02T12:00:00.000Z' }),
                shot({ id: 'b', author: 'bob', timestamp: '2026-11-03T12:00:00.000Z' }),
            ],
            10
        );
        const partial = readArchiveFacts([shot({ id: 'b', author: 'bob' })], 10);

        const merged = withFactsSnapshot(partial, toFactsSnapshot(full));

        expect(merged.total).toBe(2);
        expect(merged.authors).toBe(2);
        expect(merged.months).toBe(17);
        expect(merged.topAuthors).toEqual([{ name: 'ann', count: 1 }, { name: 'bob', count: 1 }]);
        // «Первый кадр» неполного архива — не первый кадр: печать с такой
        // подписью показывать нельзя, дату берут из снимка.
        expect(merged.firstShot).toBeNull();
    });

    it('без снимка числа остаются живыми', () => {
        const partial = readArchiveFacts([shot({ id: 'b', author: 'bob' })], 10);

        expect(withFactsSnapshot(partial, null)).toBe(partial);
    });
});
