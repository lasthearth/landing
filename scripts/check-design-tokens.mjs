/**
 * Проверка существования дизайн-токенов `--lh-*`.
 *
 * Ловит класс ошибок, который не видит ни `tsc`, ни `check-contrast.mjs`:
 * использование `var(--lh-…)` с опечаткой или устаревшим именем токена.
 * Объявленный где-то токен молча не рисуется: значение недействительно
 * в вычисленное время, рамка или цвет просто пропадают.
 *
 * Что считается объявлением:
 * - `--lh-…: значение;` в любом `.css`/`.less` проекта;
 * - строка `'--lh-…'` в TS (константа или аргумент `setProperty`);
 * - биндинг `[style.--lh-…]` в шаблоне.
 *
 * Использование с запасным значением (`var(--lh-…, fallback)`) разрешено
 * всегда: так ссылаются на токены, устанавливаемые в рантайме
 * (`--lh-reveal-delay`, `--lh-consent-h`).
 *
 * Запуск: node scripts/check-design-tokens.mjs
 * Выход: 0 — всё объявлено; 1 — печатает список «файл:строка — токен».
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Расширения, в которых ищем и объявления, и использования. */
const EXTS = /\.(less|css|html|ts)$/;

/**
 * Обходит `src` рекурсивно, пропуская артефакты сборки.
 *
 * @returns {string[]} Пути к файлам.
 */
function collect() {
    const out = [];

    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.angular' || entry.name === 'dist') {
                continue;
            }

            const full = join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(full);
            } else if (EXTS.test(entry.name)) {
                out.push(full);
            }
        }
    };

    walk(join(ROOT, 'src'));

    return out;
}

const files = collect();

/** Имя токена из объявления `--lh-…: …` или упоминания в TS/шаблоне. */
const DECLARED = new Set();

/** Использование без запасного значения: токен → [{ file, line }]. */
const bare = new Map();

for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length + 1);

    for (const match of text.matchAll(/(--lh-[a-z0-9-]+)\s*:/g)) {
        DECLARED.add(match[1]);
    }

    // TS: константа вида const H = '--lh-consent-h' и вызовы setProperty.
    for (const match of text.matchAll(/['"`](--lh-[a-z0-9-]+)['"`]/g)) {
        DECLARED.add(match[1]);
    }

    // Шаблон: биндинг [style.--lh-…].
    for (const match of text.matchAll(/\[style\.(--lh-[a-z0-9-]+)/g)) {
        DECLARED.add(match[1]);
    }

    for (const match of text.matchAll(/var\(\s*(--lh-[a-z0-9-]+)\s*(,|\))/g)) {
        if (match[2] === ',') {
            // Запасное значение есть — рантайм-токены проходят без объявления.
            continue;
        }

        const token = match[1];
        const line = text.slice(0, match.index).split('\n').length;

        if (!bare.has(token)) {
            bare.set(token, []);
        }

        bare.get(token).push({ file: rel, line });
    }
}

const missing = [...bare.keys()].filter((token) => !DECLARED.has(token)).sort();

if (missing.length > 0) {
    console.error('Необъявленные токены --lh-* (var() без запасного значения):');

    for (const token of missing) {
        for (const { file, line } of bare.get(token)) {
            console.error(`  ${file}:${line}  ${token}`);
        }
    }

    console.error(`Всего: ${missing.length}. Объявите токен или исправьте имя (см. docs/DESIGN_SYSTEM.md).`);
    process.exit(1);
}

console.log(`Токены --lh-*: ${DECLARED.size} объявлено, необъявленных использований нет.`);
