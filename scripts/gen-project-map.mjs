/**
 * Генерирует docs/project-map.md — навигационную карту проекта для агентов.
 *
 * Карта строится из кода (роуты, слайсы, словари, скрипты), поэтому не устаревает.
 * Летопись решений живёт отдельно — docs/history.md.
 *
 * Запуск: node scripts/gen-project-map.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Куда пишем карту. */
const OUT = join(ROOT, 'docs', 'project-map.md');

/** Обратная кавычка: markdown-спаны в шаблоне кода не выразить иначе. */
const BT = '\u0060';

/** Сегменты слайса по FSD. */
const SEGMENTS = ['ui', 'model', 'api', 'lib', 'config'];

/**
 * Путь в POSIX-виде относительно корня.
 *
 * @param {string} full Абсолютный путь.
 * @returns {string} Путь с прямыми слэшами.
 */
const rel = (full) => relative(ROOT, full).split('\\').join('/');

/**
 * Размер файла в килобайтах.
 *
 * @param {string} full Абсолютный путь.
 * @returns {string} Размер с одним знаком после запятой.
 */
const kb = (full) => (readFileSync(full).length / 1024).toFixed(1);

/**
 * Перечисляет каталоги первого уровня.
 *
 * @param {string} dir Каталог.
 * @returns {string[]} Имена подкаталогов.
 */
function dirs(dir) {
    if (!existsSync(dir)) {
        return [];
    }

    return readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

/**
 * Считает файлы внутри каталога рекурсивно.
 *
 * @param {string} dir Каталог.
 * @returns {number} Количество файлов.
 */
function countFiles(dir) {
    if (!existsSync(dir)) {
        return 0;
    }

    return readdirSync(dir, { withFileTypes: true }).reduce(
        (total, entry) => total + (entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1),
        0
    );
}

/**
 * Разбирает app.routes.ts в плоский список роутов.
 *
 * Строка-атрибут относится к ближайшему роуту, объявленному выше и левее:
 * так поля вложенного роута не приписываются родителю.
 *
 * @returns {{ full: string, component: string, guards: string[], dicts: string[], key: string }[]} Роуты.
 */
function parseRoutes() {
    const file = join(ROOT, 'src', 'app', 'routes', 'app.routes.ts');
    const lines = readFileSync(file, 'utf8').split('\n');
    const found = [];

    for (const line of lines) {
        const pathMatch = /^(\s*)path: '([^']*)',/.exec(line);

        if (pathMatch) {
            const indent = pathMatch[1].length;
            const parent = [...found].reverse().find((route) => route.indent < indent);
            const full = (parent ? parent.full + '/' + pathMatch[2] : pathMatch[2]).replace(/\/+/g, '/');

            found.push({ indent, full, component: '—', guards: [], dicts: [], key: '—' });

            continue;
        }

        const indent = line.length - line.trimStart().length;
        const route = [...found].reverse().find((item) => item.indent <= indent);

        if (!route) {
            continue;
        }

        const component = /then\(\(m\) => m\.(\w+Component)\)/.exec(line);

        if (component) {
            route.component = component[1];
        }

        for (const guard of line.match(/(\w+Guard)/g) ?? []) {
            route.guards.push(guard);
        }

        for (const dict of line.match(/translations\/features\/([\w-]+)\.i18n/g) ?? []) {
            route.dicts.push(dict.split('/').pop().replace('.i18n', ''));
        }

        const key = /RouteKeys\.(\w+)/.exec(line);

        if (key) {
            route.key = key[1];
        }
    }

    return found.filter((route) => route.full !== '');
}

const routes = parseRoutes();
const prerender = new Set(
    readFileSync(join(ROOT, 'routes.txt'), 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
);

const dictionaryUsage = new Map();

for (const route of routes) {
    for (const dict of new Set(route.dicts)) {
        const list = dictionaryUsage.get(dict) ?? [];
        list.push(route.full);
        dictionaryUsage.set(dict, list);
    }
}

const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
const lines = [];

lines.push('# PROJECT_MAP.md — навигация по Last Hearth Landing');
lines.push('');
lines.push('> **СГЕНЕРИРОВАНО** командой ' + BT + 'npm run map' + BT + '. Руками не править: правки затрёт следующая генерация.');
lines.push('> Летопись решений — ' + BT + 'docs/history.md' + BT + ', правила и ловушки — ' + BT + 'AGENT_RULES_MAP.md' + BT + '.');
lines.push('');
lines.push('## 1. Команды');
lines.push('');
lines.push('| Команда | Что выполняет |');
lines.push('|---|---|');

for (const [name, command] of Object.entries(scripts)) {
    lines.push('| ' + BT + 'npm run ' + name + BT + ' | ' + BT + command + BT + ' |');
}

lines.push('');
lines.push('## 2. Слои src/app');
lines.push('');
lines.push('| Слой | Файлов | Внутри |');
lines.push('|---|---|---|');
lines.push('| src/app | ' + countFiles(join(ROOT, 'src', 'app')) + ' | ' + dirs(join(ROOT, 'src', 'app')).join(', ') + ' |');


for (const layer of dirs(join(ROOT, 'src', 'app'))) {
    const dir = join(ROOT, 'src', 'app', layer);

    lines.push('| ' + layer + '/ | ' + countFiles(dir) + ' | ' + dirs(dir).join(', ') + ' |');
}

lines.push('');
lines.push('## 3. Слайсы features / entities');
lines.push('');
lines.push('| Слайс | Файлов | Сегменты | index.ts | Строк экспорта |');
lines.push('|---|---|---|---|---|');

for (const root of ['features', 'entities']) {
    for (const slice of dirs(join(ROOT, 'src', 'app', root))) {
        const dir = join(ROOT, 'src', 'app', root, slice);
        const segments = SEGMENTS.filter((segment) => existsSync(join(dir, segment)));
        const barrel = join(dir, 'index.ts');
        const exported = existsSync(barrel)
            ? readFileSync(barrel, 'utf8').split('\n').filter((line) => line.startsWith('export')).length
            : 0;

        lines.push(
            '| ' +
                root +
                '/' +
                slice +
                ' | ' +
                countFiles(dir) +
                ' | ' +
                (segments.join(', ') || '—') +
                ' | ' +
                (existsSync(barrel) ? 'да' : '**нет**') +
                ' | ' +
                (exported || '—') +
                ' |'
        );
    }
}

lines.push('');
lines.push('## 4. Роуты');
lines.push('');
lines.push('| Путь | Компонент | Гварды | Словари i18n | Пререндер | SEO-ключ |');
lines.push('|---|---|---|---|---|---|');

for (const route of routes) {
    lines.push(
        '| ' +
            BT +
            route.full +
            BT +
            ' | ' +
            BT +
            route.component +
            BT +
            ' | ' +
            ([...new Set(route.guards)].join(', ') || '—') +
            ' | ' +
            ([...new Set(route.dicts)].join(', ') || '—') +
            ' | ' +
            (prerender.has(route.full) ? 'да' : '—') +
            ' | ' +
            route.key +
            ' |'
    );
}

lines.push('');
lines.push('## 5. Словари i18n (feature)');
lines.push('');
lines.push('| Словарь | KB | Грузится на |');
lines.push('|---|---|---|');

const dictDir = join(ROOT, 'src', 'app', 'core', 'i18n', 'translations', 'features');

for (const file of readdirSync(dictDir).sort()) {
    const name = file.replace('.i18n.ts', '');

    lines.push(
        '| ' +
            name +
            ' | ' +
            kb(join(dictDir, file)) +
            ' | ' +
            ((dictionaryUsage.get(name) ?? ['—']).join(', ') || '—') +
            ' |'
    );
}

lines.push('');
lines.push('Общие словари (common, header, footer, shared, news) подключены сразу в');
lines.push(BT + 'src/app/core/i18n/translations/index.ts' + BT + '. Остальные приезжают вместе с роутом через ' + BT + 'loadPage()' + BT + '.');
lines.push('');
lines.push('## 6. Проверки');
lines.push('');
lines.push('| Проверка | Скрипт |');
lines.push('|---|---|');
lines.push('| Границы FSD, index.ts, слои | scripts/check-architecture.mjs |');
lines.push('| Полнота локалей ru/en | scripts/check-i18n.mjs |');
lines.push('| Контраст токенов WCAG AA | scripts/check-contrast.mjs |');
lines.push('| Бюджет агентских документов | scripts/check-context-budget.mjs |');
lines.push('| Живость указателей | scripts/check-doc-pointers.mjs |');
lines.push('');

const text = lines.join('\n');

// --stdout печатает карту вместо записи: нужно там, где писать на диск нельзя.
if (process.argv.includes('--stdout')) {
    process.stdout.write(text);
} else {
    writeFileSync(OUT, text);
    console.log('Карта записана: ' + rel(OUT) + ' (' + lines.length + ' строк, роутов ' + routes.length + ')');
}
