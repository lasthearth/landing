/**
 * Бюджет агентских документов: сколько контекста они съедают каждый ход.
 *
 * AGENTS.md читается агентом принудительно в каждом запросе — он и есть резидентная
 * стоимость. Остальные документы стоят токенов только когда к ним пришли по указателю,
 * поэтому у них бюджет мягче, но он всё равно есть: документ на 100 kB не читают.
 *
 * Запуск: node scripts/check-context-budget.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Оценка числа токенов по составу символов.
 *
 * Кириллица в BPE дороже латиницы примерно в 1,6 раза, поэтому считаем раздельно.
 *
 * @param {string} text Текст документа.
 * @returns {number} Оценка токенов.
 */
function tokens(text) {
    const cyrillic = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
    const latin = (text.match(/[A-Za-z]/g) ?? []).length;

    return Math.round(cyrillic / 2.5 + latin / 4 + (text.length - cyrillic - latin) / 3);
}

/**
 * Собирает markdown-файлы каталога.
 *
 * @param {string} dir Каталог.
 * @returns {string[]} Пути к .md файлам.
 */
function markdown(dir) {
    // Архив — одноразовые артефакты прошлых работ: их вес бюджетом не меряем.
    if (!existsSync(dir) || dir.endsWith('archive')) {
        return [];
    }

    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            return markdown(full);
        }

        return entry.name.endsWith('.md') ? [full] : [];
    });
}

/** Резидентный бюджет: файл, который агент читает всегда. */
const RESIDENT = { file: 'AGENTS.md', limit: 8 * 1024 };

/** Бюджет документов, к которым приходят по указателю. */
const POINTED = 48 * 1024;

/** Максимальный размер истории: летопись читают только точечно. */
const SPECIAL = { 'docs/history.md': 120 * 1024 };

const rows = [];
const failures = [];
const rel = (file) => relative(ROOT, file).split('\\').join('/');

const residentPath = join(ROOT, RESIDENT.file);

if (!existsSync(residentPath)) {
    console.error('нет ' + RESIDENT.file + ' — агенту неоткуда узнать правила проекта');
    process.exit(1);
}

const residentText = readFileSync(residentPath, 'utf8');
const residentSize = statSync(residentPath).size;

rows.push({
    file: RESIDENT.file,
    kb: residentSize / 1024,
    tokens: tokens(residentText),
    role: 'резидентный (каждый ход)',
    limit: RESIDENT.limit / 1024,
});

if (residentSize > RESIDENT.limit) {
    failures.push(RESIDENT.file + ' весит ' + (residentSize / 1024).toFixed(1) + ' kB при бюджете 8 kB');
}

for (const file of [...markdown(join(ROOT, 'docs')), join(ROOT, 'AGENT_RULES_MAP.md'), join(ROOT, 'README.md')]) {
    if (!existsSync(file)) {
        continue;
    }

    const name = rel(file);
    const size = statSync(file).size;
    const limit = SPECIAL[name] ?? POINTED;

    rows.push({
        file: name,
        kb: size / 1024,
        tokens: tokens(readFileSync(file, 'utf8')),
        role: 'по указателю',
        limit: limit / 1024,
    });

    if (size > limit) {
        failures.push(name + ' весит ' + (size / 1024).toFixed(1) + ' kB при бюджете ' + (limit / 1024).toFixed(0) + ' kB');
    }
}

rows.sort((a, b) => b.kb - a.kb);

console.log('| Документ | kB | ~токенов | Роль | Бюджет kB |');
console.log('|---|---|---|---|---|');

for (const row of rows) {
    console.log(
        '| ' +
            row.file +
            ' | ' +
            row.kb.toFixed(1) +
            ' | ' +
            row.tokens +
            ' | ' +
            row.role +
            ' | ' +
            row.limit.toFixed(0) +
            ' |'
    );
}

const total = rows.reduce((sum, row) => sum + row.tokens, 0);
const resident = rows.find((row) => row.file === RESIDENT.file);

console.log('');
console.log('Резидентно каждый ход: ~' + resident.tokens + ' токенов (' + RESIDENT.file + ').');
console.log('Весь агентский корпус: ~' + total + ' токенов, но он читается по указателям, а не целиком.');

if (failures.length) {
    console.log('');
    console.log('Бюджет превышен:');

    for (const item of failures) {
        console.log('  ' + item);
    }

    console.log('Сжимайте AGENTS.md до указателей, а большие документы делите по ветвям.');
    process.exit(1);
}

console.log('Бюджеты соблюдены.');
