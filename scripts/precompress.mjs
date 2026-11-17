/**
 * Сжатые копии статики для Node-сервера: рядом с каждым текстовым файлом
 * сборки кладёт `<файл>.gz` и `<файл>.br`. Сервер (src/server.ts) отдаёт копию
 * браузеру, который принимает brotli или gzip. Запускается в Dockerfile после
 * `npm run build`.
 *
 * Сжатие при сборке, а не на лету: файлы не меняются до следующей выкладки,
 * и сервер не тратит процессор на каждый запрос. Brotli уровня 9 жмёт заметно
 * плотнее gzip при сопоставимом времени сборки; уровень 11 растягивает сборку
 * на минуты ради пары процентов.
 *
 * HTML предрендера тоже сжимается: чистые адреса (`/rules`) сервер отдаёт
 * с диска, не запуская Angular и не сжимая страницу заново на каждый запрос.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const ROOT = process.argv[2] ?? 'dist/last-hearth-landing/browser';
const TYPES = /\.(?:m?js|css|svg|json|webmanifest|xml|txt|html)$/i;
const MIN_BYTES = 1024;

let count = 0;
let before = 0;
let gzipBytes = 0;
let brotliBytes = 0;

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
            const data = readFileSync(path);
            const gz = gzipSync(data, { level: constants.Z_BEST_COMPRESSION });
            const br = brotliCompressSync(data, {
                params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
            });

            writeFileSync(`${path}.gz`, gz);
            writeFileSync(`${path}.br`, br);
            count += 1;
            before += stat.size;
            gzipBytes += gz.length;
            brotliBytes += br.length;
        }
    }
}

walk(ROOT);
console.log(
    `gzip: ${count} файлов, ${(before / 1048576).toFixed(1)} МБ → ${(gzipBytes / 1048576).toFixed(1)} МБ; ` +
        `brotli: ${(brotliBytes / 1048576).toFixed(1)} МБ`
);
