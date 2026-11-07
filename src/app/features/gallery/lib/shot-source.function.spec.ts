import { nextShotStage, readShotSrc, ShotSource } from './shot-source.function';

/**
 * Кадр архива с медиа-прокси Discord: только этот хост меняет размер на лету.
 */
const shot: ShotSource = {
    url: 'https://cdn.discordapp.com/attachments/11/22/shot.png',
    proxyUrl: 'https://media.discordapp.net/attachments/11/22/shot.png',
    width: 1920,
    height: 1080,
};

describe('nextShotStage', () => {
    it('первый сбой переводит отпечаток на оригинал', () => {
        expect(nextShotStage(undefined)).toBe('original');
        expect(nextShotStage('thumb')).toBe('original');
    });

    it('сбой оригинала переводит отпечаток в заглушку', () => {
        expect(nextShotStage('original')).toBe('dead');
    });

    it('заглушка конечная: цепочка не зацикливается', () => {
        let stage = nextShotStage(undefined);

        for (let i = 0; i < 5; i++) {
            stage = nextShotStage(stage);
        }

        expect(stage).toBe('dead');
        expect(nextShotStage('dead')).toBe('dead');
    });
});

describe('readShotSrc', () => {
    it('на стадии копии просит у прокси уменьшенный кадр', () => {
        const src = readShotSrc(shot, 800, 'thumb');
        const parsed = new URL(src ?? '');

        expect(parsed.hostname).toBe('media.discordapp.net');
        expect(parsed.searchParams.get('width')).toBe('800');
        expect(parsed.searchParams.get('height')).toBe('450');
        expect(parsed.searchParams.get('format')).toBe('jpeg');
    });

    it('на стадии оригинала отдаёт полный адрес кадра', () => {
        expect(readShotSrc(shot, 800, 'original')).toBe(shot.url);
    });

    it('на стадии заглушки адреса нет — картинка не рендерится', () => {
        expect(readShotSrc(shot, 800, 'dead')).toBeNull();
    });

    it('без размеров оригинала копия равна превью, а не пустому адресу', () => {
        const unknown: ShotSource = { url: shot.url, proxyUrl: shot.proxyUrl };

        expect(readShotSrc(unknown, 800, 'thumb')).toBe(shot.proxyUrl);
    });

    it('стадии дают разные адреса: повторный запрос не повторяет первый', () => {
        const thumb = readShotSrc(shot, 800, 'thumb');
        const original = readShotSrc(shot, 800, 'original');

        expect(thumb).not.toBe(original);
        expect(thumb).not.toBeNull();
    });
});
