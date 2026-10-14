import { ModRelease } from '../model/server-mod.types';
import { gameBranch, modCompatibility } from './mod-compatibility.function';

/**
 * Версия мода с заданными версиями игры.
 *
 * @param gameVersions Версии игры.
 * @returns Версия мода.
 */
function release(gameVersions: string[]): ModRelease {
    return { version: '1.0.0', gameVersions, fileUrl: '', fileName: '', fileSize: 0, releasedAt: null };
}

describe('modCompatibility', () => {
    it('точное совпадение версии игры — exact', () => {
        expect(modCompatibility(release(['1.22.6', '1.22.7']), '1.22.7')).toBe('exact');
    });

    it('та же ветка игры — minor', () => {
        expect(modCompatibility(release(['1.22.0']), '1.22.7')).toBe('minor');
    });

    it('другая ветка или пустой список — other', () => {
        expect(modCompatibility(release(['1.21.5']), '1.22.7')).toBe('other');
        expect(modCompatibility(release([]), '1.22.7')).toBe('other');
        expect(modCompatibility(null, '1.22.7')).toBe('other');
    });

    it('ветка — первые два числа', () => {
        expect(gameBranch('1.22.7')).toBe('1.22');
        expect(gameBranch('1.22.0-rc.1')).toBe('1.22');
    });
});
