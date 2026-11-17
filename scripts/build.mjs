/**
 * Сборка прод-бандла под замком.
 *
 * Обёртка над `ng build`, чтобы две сборки не писали в `dist/` одновременно
 * (см. `scripts/lib/build-lock.mjs`). Остальные аргументы передаются в `ng build`
 * без изменений.
 *
 * Запуск: `npm run build` или `npm run build -- --configuration development`.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireBuildLock } from './lib/build-lock.mjs';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const release = acquireBuildLock('ng build');

try {
    const run = spawnSync(
        process.execPath,
        ['node_modules/@angular/cli/bin/ng', 'build', ...process.argv.slice(2)],
        { cwd: ROOT, stdio: 'inherit' }
    );

    process.exitCode = run.status ?? 1;
} finally {
    release();
}