/**
 * Страж компонентных стилей: селектор с внешним предком (`body.…`, `html.…`)
 * при эмулированной инкапсуляции Angular не матчится никогда — компилятор
 * дописывает `_ngcontent` к последнему простому селектору, то есть к самому
 * body. Правило молча не работает; реакция на классы body/html — только
 * `:host-context(body.класс) .элемент` (прецедент — game-chat-widget).
 *
 * Глобальные стили (`src/styles.css`, `src/app/shared/styles/`) не сканируются:
 * там body и html — законные цели.
 *
 * Запуск: node scripts/check-component-styles.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Каталог компонентных стилей. */
const SCAN_DIR = join(ROOT, 'src', 'app');

/** Префикс путей глобальных стилей, которые скан не трогает. */
const GLOBAL_PREFIX = join('src', 'app', 'shared', 'styles');

/** Селектор строкой, начинающейся с body или html. */
const EXTERNAL_ANCESTOR = /^\s*(body|html)\s*[.:,[\s>]/;

/**
 * Собирает все `.less` каталога рекурсивно.
 *
 * @param dir Абсолютный путь каталога.
 * @returns {string[]} Абсолютные пути less-файлов.
 */
function collectLess(dir) {
    const files = [];

    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) {
            files.push(...collectLess(path));
        } else if (entry.endsWith('.less')) {
            files.push(path);
        }
    }

    return files;
}

const hits = [];

for (const file of collectLess(SCAN_DIR)) {
    const rel = relative(ROOT, file);

    if (rel.startsWith(GLOBAL_PREFIX)) {
        continue;
    }

    readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) {
                return;
            }

            if (EXTERNAL_ANCESTOR.test(line)) {
                hits.push(`${rel}:${index + 1}: ${trimmed}`);
            }
        });
}

if (hits.length) {
    console.log('Селекторы компонентных стилей с внешним предком не матчатся никогда:');

    for (const hit of hits) {
        console.log('  ' + hit);
    }

    console.log('Реакция на классы body/html — :host-context(body.класс) .элемент, см. game-chat-widget.');
    process.exit(1);
}
