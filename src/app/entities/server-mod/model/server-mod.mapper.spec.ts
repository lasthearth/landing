import { mapModArchive, mapServerMod, mapServerMods } from './server-mod.mapper';

describe('server-mod mapper', () => {
    it('без id мод пропускается', () => {
        expect(mapServerMod({ name: 'Без id' })).toBeNull();
        expect(mapServerMods([{ name: 'Без id' }, { id: 'carryon' }]).map((mod) => mod.id)).toEqual(['carryon']);
    });

    it('int64 размера приходит строкой и становится числом', () => {
        const mod = mapServerMod({ id: 'carryon', release: { version: '2.0.0', file_size: '655360' } });
        expect(mod?.release?.fileSize).toBe(655360);
    });

    it('незаданная аудитория — «по желанию», чтобы мод не попал в архив', () => {
        expect(mapServerMod({ id: 'a', audience: 'MOD_AUDIENCE_UNSPECIFIED' })?.audience).toBe('MOD_AUDIENCE_OPTIONAL');
        expect(mapServerMod({ id: 'b', audience: 'MOD_AUDIENCE_HIDDEN' })?.audience).toBe('MOD_AUDIENCE_HIDDEN');
    });

    it('путь архива дополняется адресом API, пустой архив — null', () => {
        expect(mapModArchive({ url: '/v1/mods/archive.zip', count: 3, size: '10' }, 'https://api.lasthearth.ru')?.url).toBe(
            'https://api.lasthearth.ru/v1/mods/archive.zip'
        );
        expect(mapModArchive({ url: '/v1/mods/archive.zip', count: 0 }, 'https://api.lasthearth.ru')).toBeNull();
    });
});
