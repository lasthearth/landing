/**
 * Проверяет, что указатели в агентских документах ведут на существующие файлы.
 *
 * Мёртвый указатель — тихий баг ориентирования: агент идёт по нему, не находит документ
 * и начинает искать заново, тратя ходы. Летопись и архив исключены: их ссылки устаревают
 * законно, поэтому они только печатаются отдельным списком.
 *
 * Запуск: node scripts/check-doc-pointers.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Документы, в которых ищем указатели. */
const DOCS = ['AGENTS.md', 'AGENT_RULES_MAP.md', 'README.md'];

/** Расширения, по которым распознаём путь в тексте. */
const EXTENSIONS = /\.(md|ts|mjs|js|json|css|less|html|txt|yaml|yml)$/;

/** Пути, упомянутые в документах именно как несуществующие (таблица расхождений). */
const ABSENT = ['src/app/services/seo.service.ts', 'src/app/styles/variables.less', 'scripts/extract-rules.mjs'];

/** Символы, после которых это уже не путь, а шаблон или маска. */
const TEMPLATE_CHARS = ['*', '{', '}', '<', '>', '|'];

/**
 * Отбрасывает кандидатов, которые не являются ссылкой на файл.
 *
 * @param {string} value Кандидат из текста.
 * @returns {boolean} true, если это указатель на файл.
 */
function isPointer(value) {
    return (
        value.includes('/') &&
        !value.includes(' ') &&
        !value.startsWith('@') &&
        !value.startsWith('http') &&
        !value.includes('node_modules') &&
        !ABSENT.includes(value) &&
        !TEMPLATE_CHARS.some((char) => value.includes(char)) &&
        EXTENSIONS.test(value)
    );
}

/**
 * Собирает указатели из документа.
 *
 * @param {string} text Текст документа.
 * @returns {string[]} Пути, упомянутые в тексте.
 */
function candidates(text) {
    const found = new Set();
    const inline = /[\u0060]([^\u0060\n]+)[\u0060]/g;
    const links = /\]\(([^)\s]+)\)/g;
    let match;

    while ((match = inline.exec(text))) {
        const value = match[1].trim().replace(/:\d+(-\d+)?$/, '');

        if (isPointer(value)) {
            found.add(value);
        }
    }

    while ((match = links.exec(text))) {
        const value = match[1].trim();

        if (!value.startsWith('http') && !value.startsWith('#') && isPointer(value)) {
            found.add(value);
        }
    }

    return [...found];
}

const docsDir = join(ROOT, 'docs');

if (existsSync(docsDir)) {
    for (const entry of readdirSync(docsDir)) {
        if (entry.endsWith('.md')) {
            DOCS.push(join('docs', entry));
        }
    }
}

const dead = [];
const historical = [];
let checked = 0;

for (const doc of DOCS) {
    const file = join(ROOT, doc);
    const past = doc.includes('history.md') || doc.includes('archive/');

    if (!existsSync(file)) {
        (past ? historical : dead).push({ doc, target: doc });

        continue;
    }

    for (const target of candidates(readFileSync(file, 'utf8'))) {
        checked += 1;

        // Путь в документе бывает относительным и к самому документу, и к корню репозитория.
        const resolved = [resolve(dirname(file), target), resolve(ROOT, target)];

        if (!resolved.some((candidate) => existsSync(candidate))) {
            (past ? historical : dead).push({ doc, target });
        }
    }
}

if (historical.length > 0) {
    console.log('Устаревшие ссылки в летописи и архиве (' + historical.length + ', проверку не валят):');

    for (const item of historical.slice(0, 8)) {
        console.log('  ' + item.doc + '  ->  ' + item.target);
    }

    console.log('');
}

if (dead.length > 0) {
    console.log('Мёртвые указатели (' + dead.length + '):');

    for (const item of dead) {
        console.log('  ' + item.doc + '  ->  ' + item.target);
    }

    console.log('');
    console.log('Указатель обязан вести на существующий файл: иначе агент тратит ход на поиск.');

    process.exit(1);
}

console.log('Указатели живы: проверено ' + checked + ' ссылок в ' + DOCS.length + ' документах.');
