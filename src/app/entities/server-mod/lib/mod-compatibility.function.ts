import { ModCompatibility, ModRelease } from '../model/server-mod.types';

/**
 * Ветка версии игры: `1.22.7` → `1.22`.
 *
 * @param version Версия игры.
 * @returns Первые два числа версии.
 */
export function gameBranch(version: string): string {
    return version.split('.').slice(0, 2).join('.');
}

/**
 * Насколько версия мода подходит к версии игры сервера.
 *
 * ModDB хранит у версии мода список версий игры, отмеченных автором.
 * Точное совпадение — `exact`; та же ветка (1.22.x) — `minor`: моды обычно
 * работают внутри ветки, но автор этого не подтверждал.
 *
 * @param release Версия мода.
 * @param gameVersion Версия игры сервера.
 * @returns Степень совместимости.
 */
export function modCompatibility(release: ModRelease | null, gameVersion: string): ModCompatibility {
    if (!release || !gameVersion) {
        return 'other';
    }

    if (release.gameVersions.includes(gameVersion)) {
        return 'exact';
    }

    const branch = gameBranch(gameVersion);
    return release.gameVersions.some((version) => gameBranch(version) === branch) ? 'minor' : 'other';
}
