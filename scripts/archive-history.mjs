/**
 * Архивирование летописи: переносит старейшие записи раздела 3 из
 * `docs/history.md` в `docs/archive/history-early.md`, пока летопись держит
 * бюджет 120 kB. Запись, чей заголовок уже есть в архиве, удаляется без
 * переноса — дубли летописи не нужны.
 *
 * Запуск: `node scripts/archive-history.mjs`. Печатает перенесённые
 * заголовки и итоговый размер; без работы выходит с кодом 0.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const historyPath = join(root, 'docs/history.md');
const archivePath = join(root, 'docs/archive/history-early.md');

/** Предел летописи из `scripts/check-context-budget.mjs`. */
const CAP = 120 * 1024;

/** Меньше этого числа записей раздела 3 в летописи не оставляем. */
const MIN_KEEP = 10;

const size = (text) => Buffer.byteLength(text, 'utf8');

/**
 * Индексы начал секций `### 3.-N` в тексте.
 *
 * @param text Содержимое файла летописи.
 * @returns Позиции первых символов заголовков секций.
 */
function sectionStarts(text) {
    const starts = [];
    const re = /^### 3\.-/gm;

    for (let match = re.exec(text); match; match = re.exec(text)) {
        starts.push(match.index);
    }

    return starts;
}

/**
 * Границы последней (старейшей) секции раздела 3.
 *
 * @param text Содержимое файла летописи.
 * @param starts Индексы начал секций.
 * @returns Пара [начало, конец] или `null`, если секций нет.
 */
function lastSection(text, starts) {
    if (starts.length === 0) {
        return null;
    }

    const begin = starts[starts.length - 1];
    const rest = text.slice(begin + 4);
    const next = rest.search(/^#{2,3} /m);

    return [begin, next === -1 ? text.length : begin + 4 + next];
}

let history = readFileSync(historyPath, 'utf8');
let archive = readFileSync(archivePath, 'utf8');
const moved = [];

while (size(history) > CAP) {
    const starts = sectionStarts(history);

    if (starts.length <= MIN_KEEP) {
        break;
    }

    const [begin, end] = lastSection(history, starts);
    const section = history.slice(begin, end);
    const heading = section.slice(0, section.indexOf('\n'));

    history = history.slice(0, begin) + history.slice(end);

    if (!archive.includes(heading)) {
        moved.push(section);
    }
}

if (moved.length > 0) {
    const newest = moved[moved.length - 1].match(/^### (3\.-\d+)/m)[1];
    const current = Number((archive.match(/^# Ранние записи летописи \(3\.0—(3\.-\d+)\)/m) ?? [])[1]?.replace('3.-', ''));
    const fresh = Number(newest.replace('3.-', ''));

    if (!Number.isFinite(current) || fresh > current) {
        archive = archive.replace(
            /^# Ранние записи летописи \(3\.0—[^\)]*\)/m,
            `# Ранние записи летописи (3.0—${newest})`
        );
    }

    archive = archive.trimEnd() + '\n' + moved.join('');
    writeFileSync(archivePath, archive, 'utf8');
}

writeFileSync(historyPath, history, 'utf8');

console.log(
    moved.length > 0
        ? `Перенесено секций: ${moved.length} (${moved.map((s) => s.match(/^### (3\.-\d+)/m)[1]).join(', ')})`
        : 'Переносить нечего'
);
console.log(`Летопись: ${(size(history) / 1024).toFixed(1)} kB из 120 kB`);
