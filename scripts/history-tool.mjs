/**
 * Летопись `docs/history.md`: вставка новой записи с автоматическим номером.
 *
 * Номер `3.-NN` считается по текущему файлу, запись вставляется под заголовком
 * раздела «Недавние крупные изменения». Ручная нумерация давала конфликт на каждом
 * параллельном PR: две ветки берут один и тот же следующий номер и правят одну строку.
 *
 * Запуск:
 *   npm run history -- add "Заголовок" --body-file /tmp/entry.md
 *   npm run history -- add "Заголовок" < entry.md
 *   npm run history -- add "Заголовок" --body-file entry.md --stdout   — только показать
 *
 * После вставки скрипт переносит старейшие записи в архив и проверяет бюджет 120 kB.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Путь к летописи. */
const HISTORY = resolve(ROOT, 'docs/history.md');

/** Заголовок раздела, под которым живут свежие записи. */
const SECTION = '## 3. Недавние крупные изменения';

/**
 * Разбирает аргументы командной строки.
 *
 * @param argv Аргументы процесса без node и пути скрипта.
 * @returns Свободные аргументы и флаги.
 */
function parseArgs(argv) {
    const flags = {};
    const rest = [];

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];

        if (!token.startsWith('--')) {
            rest.push(token);
            continue;
        }

        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--')) {
            flags[token.slice(2)] = true;
            continue;
        }

        flags[token.slice(2)] = next;
        i += 1;
    }

    return { rest, flags };
}

/**
 * Читает текст записи: из файла или со стандартного ввода.
 *
 * @param flags Разобранные флаги.
 * @returns Текст записи без завершающих переводов строки.
 */
function readBody(flags) {
    if (typeof flags['body-file'] === 'string') {
        return readFileSync(flags['body-file'], 'utf8').trim();
    }

    if (!process.stdin.isTTY) {
        return readFileSync(0, 'utf8').trim();
    }

    console.error('Нужен текст записи: --body-file <путь> или текст на стандартном вводе.');
    process.exit(1);
}

/**
 * Приводит текст к виду цитаты: пустая строка — `>`, остальные получают `> `.
 *
 * Уже размеченные строки не трогаются, поэтому повторный запуск ничего не ломает.
 *
 * @param body Исходный текст записи.
 * @returns Текст записи в разметке летописи.
 */
function toQuote(body) {
    return body
        .split('\n')
        .map((line) => {
            const trimmed = line.trimEnd();

            if (trimmed.startsWith('>')) {
                return trimmed;
            }

            return trimmed === '' ? '>' : '> ' + trimmed;
        })
        .join('\n');
}

/**
 * Возвращает следующий номер записи.
 *
 * @param text Текущий текст летописи.
 * @returns Номер вида `3.-NN`.
 */
function nextNumber(text) {
    let max = 0;

    for (const match of text.matchAll(/^### 3\.-(\d+)\s/gm)) {
        max = Math.max(max, Number(match[1]));
    }

    return `3.-${max + 1}`;
}

/**
 * Запускает дочерний скрипт и возвращает его код возврата.
 *
 * @param script Путь к скрипту от корня репозитория.
 * @returns Код возврата процесса.
 */
function runScript(script) {
    const run = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit' });

    return run.status ?? 1;
}

const { rest, flags } = parseArgs(process.argv.slice(2));

if (rest[0] !== 'add') {
    console.error('Команда: add "Заголовок" [--body-file <путь>] [--stdout]');
    process.exit(1);
}

const title = rest[1];

if (!title) {
    console.error('Нужен заголовок записи: history add "Заголовок"');
    process.exit(1);
}

const text = readFileSync(HISTORY, 'utf8');
const anchor = SECTION + '\n\n';

if (!text.includes(anchor)) {
    console.error(`В летописи нет раздела «${SECTION}».`);
    process.exit(1);
}

if (text.includes(' ' + title + '\n')) {
    console.error('Запись с таким заголовком уже есть в летописи.');
    process.exit(1);
}

const number = nextNumber(text);
const entry = `### ${number} ${title}\n\n${toQuote(readBody(flags))}\n\n`;

if (flags.stdout) {
    process.stdout.write(entry);
    process.exit(0);
}

writeFileSync(HISTORY, text.replace(anchor, anchor + entry));
console.log(`Запись ${number} добавлена в docs/history.md.`);

// Бюджет 120 kB: переносим старейшие записи в архив, затем проверяем цифры.
runScript('scripts/archive-history.mjs');

if (runScript('scripts/check-context-budget.mjs') !== 0) {
    process.exit(1);
}