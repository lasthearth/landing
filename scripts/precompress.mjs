/**
 * Сжатые копии статики для Node-сервера: рядом с каждым текстовым файлом
 * сборки кладёт `<файл>.gz`. Сервер (src/server.ts) отдаёт копию браузеру,
 * который принимает gzip. Запускается в Dockerfile после `npm run build`.
 *
 * Сжатие при сборке, а не на лету: файлы не меняются до следующей выкладки,
 * и сервер не тратит процессор на каждый запрос.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, constants } from 'node:zlib';

const ROOT = process.argv[2] ?? 'dist/last-hearth-landing/browser';
const TYPES = /\.(?:m?js|css|svg|json|webmanifest|xml|txt)$/i;
const MIN_BYTES = 1024;

let count = 0;
let before = 0;
let after = 0;

/**
 * Обходит каталог и сжимает подходящие файлы.
 *
 * @param {string} dir Каталог.
 */
function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const stat = statSync(path);

        if (stat.isDirectory()) {
            walk(path);
        } else if (TYPES.test(name) && stat.size >= MIN_BYTES) {
            const gz = gzipSync(readFileSync(path), { level: constants.Z_BEST_COMPRESSION });
            writeFileSync(`${path}.gz`, gz);
            count += 1;
            before += stat.size;
            after += gz.length;
        }
    }
}

walk(ROOT);
console.log(`gzip: ${count} файлов, ${(before / 1048576).toFixed(1)} МБ → ${(after / 1048576).toFixed(1)} МБ`);
