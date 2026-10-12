/**
 * Проверка архитектурных границ FSD по коду.
 *
 * Правила:
 *  1. missingBarrel      — у слайса с сегментами (ui/model/api/lib/config) обязан быть index.ts.
 *  2. deepImport         — импорт во внутренности чужого слайса (@features/x/ui/...) запрещён.
 *  3. crossSliceRelative — относительный импорт в чужой слайс в обход index.ts (предупреждение).
 *  4. upwardImport       — импорт вверх по слоям (entities не знает про features).
 *
 * Легаси-нарушения лежат в scripts/architecture-baseline.json: они не валят проверку,
 * но любое НОВОЕ нарушение — ошибка. Обновить бейзлайн: --update-baseline.
 *
 * Запуск: node scripts/check-architecture.mjs [--update-baseline]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Корень исходников приложения. */
const SRC = join(ROOT, 'src', 'app');

/** Файл с зафиксированными легаси-нарушениями. */
const BASELINE = join(ROOT, 'scripts', 'architecture-baseline.json');

/** Сегменты слайса по FSD. */
const SEGMENTS = ['ui', 'model', 'api', 'lib', 'config'];

/** Каталоги, внутри которых лежат слайсы. */
const SLICE_ROOTS = ['features', 'entities', 'widgets', 'pages'];

/** Уровни слоёв: импортировать можно только на свой уровень и ниже. */
const LAYERS = {
    styles: 0,
    shared: 0,
    core: 0,
    services: 0,
    entities: 1,
    features: 2,
    layout: 3,
    widgets: 3,
    pages: 4,
    routes: 5,
};

/** Проверки, которые валят процесс. */
const FAILING = new Set(['missingBarrel', 'deepImport', 'upwardImport', 'strayEnvironment']);

/** Названия проверок для вывода. */
const TITLES = {
    missingBarrel: 'слайс с сегментами без публичного index.ts',
    deepImport: 'импорт во внутренности чужого слайса',
    upwardImport: 'импорт вверх по слоям FSD',
    crossSliceRelative: 'относительный импорт в чужой слайс в обход index.ts',
    strayEnvironment: 'второй файл окружения вне core/config/environments',
};

/**
 * Путь к файлу в POSIX-виде относительно корня репозитория.
 *
 * @param {string} full Абсолютный путь.
 * @returns {string} Путь вида src/app/features/x/y.ts.
 */
const rel = (full) => relative(ROOT, full).split('\\').join('/');

/**
 * Рекурсивно собирает .ts файлы.
 *
 * @param {string} dir Каталог поиска.
 * @returns {string[]} Абсолютные пути файлов.
 */
function collect(dir) {
    if (!existsSync(dir)) {
        return [];
    }

    const result = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            result.push(...collect(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            result.push(full);
        }
    }

    return result;
}

/**
 * Определяет слой и слайс файла.
 *
 * @param {string} full Абсолютный путь внутри src/app.
 * @returns {{ layer: number | null, slice: string | null }} Уровень слоя и ключ слайса.
 */
function describe(full) {
    const parts = rel(full).replace('src/app/', '').split('/');
    const top = parts[0];

    if (SLICE_ROOTS.includes(top)) {
        return { layer: LAYERS[top] ?? null, slice: parts[1] ? top + '/' + parts[1] : null, crossCutting: false };
    }

    // core — сквозной слой (инфраструктура приложения): ему позволено знать про entities и features.
    return { layer: top in LAYERS ? LAYERS[top] : null, slice: null, crossCutting: top === 'core' };
}

/**
 * Переводит спецификатор импорта в путь внутри src/app.
 *
 * @param {string} specifier Строка импорта.
 * @param {string} fromFile Абсолютный путь импортирующего файла.
 * @returns {string | null} Путь внутри src/app или null для внешних пакетов.
 */
function resolveTarget(specifier, fromFile) {
    const aliases = ['app', 'routes', 'layout', 'core', 'shared', 'entities', 'features', 'pages', 'widgets'];
    const alias = aliases.find((name) => specifier === '@' + name || specifier.startsWith('@' + name + '/'));

    if (alias) {
        const rest = specifier.slice(alias.length + 1).replace(/^\//, '');

        // '@app/x' уже указывает внутрь src/app, у остальных алиасов имя слоя входит в путь.
        return alias === 'app' ? rest : alias + '/' + rest;
    }

    if (specifier.startsWith('.')) {
        const within = rel(resolve(dirname(fromFile), specifier)).replace('src/app/', '');

        return within.startsWith('..') ? null : within;
    }

    return null;
}

/**
 * Читает бейзлайн нарушений.
 *
 * @returns {Set<string>} Отпечатки известных нарушений.
 */
function readBaseline() {
    if (!existsSync(BASELINE)) {
        return new Set();
    }

    return new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).violations ?? []);
}

const violations = [];

for (const sliceRoot of SLICE_ROOTS) {
    const dir = join(SRC, sliceRoot);

    if (!existsSync(dir)) {
        continue;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }

        const slice = join(dir, entry.name);
        const segmented = SEGMENTS.some((segment) => existsSync(join(slice, segment)));

        if (segmented && !existsSync(join(slice, 'index.ts'))) {
            violations.push({
                rule: 'missingBarrel',
                file: rel(slice),
                detail: sliceRoot + '/' + entry.name,
                line: 1,
            });
        }
    }
}

// Окружение живёт только в src/app/core/config/environments: второй environment*.ts — мёртвый дубль,
// из-за которого правки уходят «в никуда» (см. docs/TRAPS.md и docs/history.md).
for (const file of collect(SRC).filter((item) => /environment(\.[\w-]+)?\.ts$/.test(item) && !rel(item).startsWith('src/app/core/config/environments/'))) {
    violations.push({ rule: 'strayEnvironment', file: rel(file), detail: 'окружение вне core/config/environments', line: 1 });
}

for (const file of collect(SRC)) {
    const source = readFileSync(file, 'utf8');
    const self = describe(file);
    const pattern = /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g;
    let match = pattern.exec(source);

    while (match) {
        const specifier = match[1];
        const within = resolveTarget(specifier, file);

        if (within !== null) {
            const parts = within.split('/');
            const top = parts[0];
            const sliceKey = SLICE_ROOTS.includes(top) && parts[1] ? top + '/' + parts[1] : null;
            const foreign = sliceKey !== null && sliceKey !== self.slice;
            const deep = foreign && SEGMENTS.includes(parts[2]);
            const upward =
                !self.crossCutting &&
                specifier.startsWith('@') &&
                top in LAYERS &&
                self.layer !== null &&
                LAYERS[top] > self.layer;
            const line = source.slice(0, match.index).split('\n').length;

            if (deep) {
                violations.push({ rule: 'deepImport', file: rel(file), detail: specifier, line });
            } else if (foreign && specifier.startsWith('.')) {
                violations.push({ rule: 'crossSliceRelative', file: rel(file), detail: specifier, line });
            }

            if (upward) {
                violations.push({ rule: 'upwardImport', file: rel(file), detail: specifier, line });
            }
        }

        match = pattern.exec(source);
    }
}

for (const item of violations) {
    item.fingerprint = item.rule + '|' + item.file + '|' + item.detail;
}

if (process.argv.includes('--update-baseline')) {
    const payload = {
        note: 'Легаси-нарушения границ FSD. Новые нарушения валит node scripts/check-architecture.mjs.',
        updatedAt: new Date().toISOString().slice(0, 10),
        violations: [...new Set(violations.map((item) => item.fingerprint))].sort(),
    };

    const serialized = JSON.stringify(payload, null, 4) + '\n';

    // --stdout нужен там, где прямое письмо на диск запрещено (агентские песочницы, CI-обёртки).
    if (process.argv.includes('--stdout')) {
        process.stdout.write(serialized);
    } else {
        writeFileSync(BASELINE, serialized);
        console.log('Бейзлайн обновлён: ' + payload.violations.length + ' известных нарушений -> ' + rel(BASELINE));
    }

    process.exit(0);
}

const baseline = readBaseline();
const fresh = violations.filter((item) => !baseline.has(item.fingerprint));
const stale = [...baseline].filter((key) => !violations.some((item) => item.fingerprint === key));

for (const rule of Object.keys(TITLES)) {
    const items = fresh.filter((item) => item.rule === rule);

    if (items.length === 0) {
        continue;
    }

    console.log('');
    console.log((FAILING.has(rule) ? 'ОШИБКА' : 'предупреждение') + ': ' + TITLES[rule] + ' (' + items.length + ')');

    for (const item of items.slice(0, 25)) {
        console.log('  ' + item.file + ':' + item.line + '  ->  ' + item.detail);
    }

    if (items.length > 25) {
        console.log('  ... ещё ' + (items.length - 25));
    }
}

const failed = fresh.some((item) => FAILING.has(item.rule));

console.log('');
console.log(
    'Архитектура: новых нарушений ' +
        fresh.length +
        ', известных (бейзлайн) ' +
        (violations.length - fresh.length) +
        ', устаревших записей ' +
        stale.length +
        '.'
);

if (stale.length > 0) {
    console.log('Часть бейзлайна не воспроизводится: обновите его через --update-baseline.');
}

if (failed) {
    console.log('Импорт между слайсами — только через их index.ts, слои — только вниз.');
}

process.exit(failed ? 1 : 0);
