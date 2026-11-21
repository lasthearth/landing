/**
 * Страж компонентных стилей. Четыре правила, которые молча ломаются без проверки.
 *
 *  1. Внешний предок (`body.…`, `html.…`): при эмулированной инкапсуляции Angular селектор
 *     не матчится никогда — компилятор дописывает `_ngcontent` к последнему простому селектору,
 *     то есть к самому body. Правило молча не работает; реакция на классы body/html — только
 *     `:host-context(body.класс) .элемент` (прецедент — game-chat-widget). У этой проверки
 *     бюджета нет: любое попадание — код 1.
 *  2. `hexColour` — литерал цвета (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`,
 *     `hsl()`, `hsla()`) в компонентном LESS. Цвет приходит только токеном `--lh-*`.
 *     Не считаются: строки-комментарии, строка, где первое объявление — кастомное свойство
 *     (`--x: …`), и строки объявлений `mask`/`mask-image`: там `#000` — операнд маски,
 *     а не цвет (player-frame).
 *  3. `bareImportant` — `!important` без обоснования. Обоснование — комментарий после него
 *     в той же строке или строка-комментарий прямо над объявлением.
 *  4. `literalZIndex` — целое число вместо `var(--lh-z-*)`. `z-index: inherit`, `z-index: auto`
 *     и `z-index: var(--lh-z-overlay)` законны; отрицательные числа считаются нарушением.
 *
 * Нарушения правил 2–4 лежат в `scripts/style-baseline.json`: попадание в бюджет проверку
 * не валит, любое нарушение сверх бюджета — код 1. Неизрасходованный бюджет печатается одной
 * строкой и код 0 не меняет. Бюджет — карта «проверка|путь|нормализованная деталь» -> число
 * повторов, поэтому новый литерал нового значения в старом файле тоже валит проверку.
 *
 * Глобальные стили (`src/styles.css`, `src/app/shared/styles/`) не сканируются: там body
 * и html — законные цели, а литералы цветов — объявление самих токенов.
 *
 * Запуск:
 *   node scripts/check-component-styles.mjs                               — проверка;
 *   node scripts/check-component-styles.mjs --update-baseline             — переписать бюджет по текущему дереву;
 *   node scripts/check-component-styles.mjs --update-baseline --stdout    — напечатать JSON вместо записи;
 *   node scripts/check-component-styles.mjs --dir tmp/probe               — диагностика: сканировать другой каталог.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Каталог компонентных стилей. */
const SCAN_DIR = join(ROOT, 'src', 'app');

/** Префикс путей глобальных стилей, которые скан не трогает. */
const GLOBAL_PREFIX = 'src/app/shared/styles';

/** Файл с бюджетом легаси-нарушений. */
const BASELINE = join(ROOT, 'scripts', 'style-baseline.json');

/** Селектор строкой, начинающейся с body или html. */
const EXTERNAL_ANCESTOR = /^\s*(body|html)\s*[.:,[\s>]/;

/** Литерал цвета: hex любой из четырёх длин или цветовая функция. */
const COLOUR_LITERAL =
    /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])|\b(?:rgba?|hsla?)\s*\([^)]*\)/g;

/** Строка, где первым объявлением идёт кастомное свойство. */
const CUSTOM_PROPERTY_FIRST = /^\s*--[\w-]+\s*:/;

/** Объявление `!important`. */
const IMPORTANT = /!important/;

/** Объявление `z-index` с целым литералом. */
const LITERAL_Z_INDEX = /^\s*z-index\s*:\s*(-?\d+)\s*(?:!important)?\s*;?\s*$/;

/** Начало объявления маски: там литерал — операнд, а не цвет. */
const MASK_DECLARATION = /^\s*(?:-webkit-)?mask(?:-image)?\s*:/;

/**
 * Путь к файлу в POSIX-виде относительно корня репозитория.
 *
 * @param {string} full Абсолютный путь.
 * @returns {string} Путь вида src/app/features/x/y.less.
 */
function rel(full) {
    return relative(ROOT, full).split('\\').join('/');
}

/**
 * Собирает все `.less` каталога рекурсивно.
 *
 * @param {string} dir Абсолютный путь каталога.
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

/**
 * Отмечает строки-комментарии: `//`, строки с ведущим `*` и внутренности блочного комментария.
 *
 * @param {string[]} lines Строки less-файла.
 * @returns {Set<number>} Индексы строк с нуля, где кода нет.
 */
function commentIndexes(lines) {
    const marked = new Set();
    let inBlock = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (inBlock) {
            marked.add(index);
            inBlock = !trimmed.includes('*/');
            return;
        }

        if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
            marked.add(index);
            return;
        }

        if (trimmed.startsWith('/*')) {
            marked.add(index);
            inBlock = !trimmed.slice(trimmed.indexOf('/*') + 2).includes('*/');
        }
    });

    return marked;
}

/**
 * Отмечает строки объявлений `mask`/`mask-image` вместе с их продолжениями.
 *
 * @param {string[]} lines Строки less-файла.
 * @returns {Set<number>} Индексы строк с нуля, которые целиком принадлежат объявлению маски.
 */
function maskIndexes(lines) {
    const marked = new Set();
    let inMask = false;

    lines.forEach((line, index) => {
        if (inMask) {
            marked.add(index);
            inMask = !line.trimEnd().endsWith(';');
            return;
        }

        if (MASK_DECLARATION.test(line)) {
            marked.add(index);
            inMask = !line.trimEnd().endsWith(';');
        }
    });

    return marked;
}

/**
 * Убирает комментарии из строки, чтобы искать по чистому коду.
 *
 * @param {string} line Строка less-файла.
 * @returns {string} Строка без блочных комментариев и хвостового `//`-комментария.
 */
function codeOf(line) {
    return line.replace(/\/\*.*?\*\//g, '').replace(/\s\/\/.*$/, '');
}

/**
 * Приводит литерал цвета к единому виду: нижний регистр, короткий hex развёрнут до полного.
 *
 * @param {string} literal Найденный литерал.
 * @returns {string} Нормализованная деталь для отпечатка бюджета.
 */
function normaliseColour(literal) {
    const value = literal.toLowerCase().replace(/\s+/g, '');

    if (!value.startsWith('#')) {
        return value;
    }

    const digits = value.slice(1);

    if (digits.length === 3 || digits.length === 4) {
        return '#' + [...digits].map((digit) => digit + digit).join('');
    }

    return value;
}

/**
 * Собирает литералы цвета строки.
 *
 * @param {string} line Строка less-файла.
 * @returns {string[]} Нормализованные литералы в порядке появления.
 */
function colourDetails(line) {
    return [...line.matchAll(COLOUR_LITERAL)].map((match) => normaliseColour(match[0]));
}

/**
 * Проверяет, есть ли у объявления обоснование `!important`.
 *
 * @param {string[]} lines Строки less-файла.
 * @param {number} index Индекс строки с нуля.
 * @param {Set<number>} comments Индексы строк-комментариев.
 * @returns {boolean} true, если комментарий стоит в конце строки или строкой выше.
 */
function hasJustification(lines, index, comments) {
    const line = lines[index];
    const at = line.lastIndexOf('!important');
    const tail = at === -1 ? line : line.slice(at);

    if (/\/\*.*?\*\//.test(tail) || /\s\/\//.test(tail)) {
        return true;
    }

    return index > 0 && comments.has(index - 1);
}

/**
 * Собирает деталь нарушения `bareImportant`: объявление без `!important` и комментариев.
 *
 * @param {string} line Строка less-файла.
 * @returns {string} Нормализованное объявление вида `display: none`.
 */
function declarationOf(line) {
    const declaration = codeOf(line)
        .replace(/!important/g, '')
        .replace(/;\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();

    return declaration || line.trim().replace(/\s+/g, ' ');
}

/**
 * Ищет нарушения всех правил в одном less-файле.
 *
 * @param {string} full Абсолютный путь файла.
 * @param {string} path Путь относительно корня для вывода и отпечатка.
 * @returns {{ ancestors: {path: string, line: number, selector: string}[], hits: {check: string, path: string, line: number, detail: string}[] }}
 *     Нарушения правила внешнего предка и нарушения трёх бюджетных правил.
 */
function scanFile(full, path) {
    const lines = readFileSync(full, 'utf8').split('\n');
    const comments = commentIndexes(lines);
    const masks = maskIndexes(lines);
    const ancestors = [];
    const hits = [];

    lines.forEach((line, index) => {
        // Набор комментариев шире прежней построчной проверки: внутренности блочного
        // комментария тоже пропускаются, результат правила 1 от этого не меняется.
        if (comments.has(index)) {
            return;
        }

        if (EXTERNAL_ANCESTOR.test(line)) {
            ancestors.push({ path, line: index + 1, selector: line.trim() });
        }

        const code = codeOf(line);

        if (!masks.has(index) && !CUSTOM_PROPERTY_FIRST.test(line)) {
            for (const detail of colourDetails(line)) {
                hits.push({ check: 'hexColour', path, line: index + 1, detail });
            }
        }

        if (IMPORTANT.test(code) && !hasJustification(lines, index, comments)) {
            hits.push({ check: 'bareImportant', path, line: index + 1, detail: declarationOf(line) });
        }

        const zIndex = code.match(LITERAL_Z_INDEX);

        if (zIndex) {
            hits.push({ check: 'literalZIndex', path, line: index + 1, detail: 'z-index: ' + zIndex[1] });
        }
    });

    return { ancestors, hits };
}

/**
 * Читает значение флага запуска.
 *
 * @param {string} name Имя флага, например `--dir`.
 * @returns {string | null} Значение флага или null, если флаг не передан.
 */
function flagValue(name) {
    const index = process.argv.indexOf(name);
    const value = index === -1 ? null : process.argv[index + 1];

    return value && !value.startsWith('--') ? value : null;
}

/**
 * Читает бюджет легаси-нарушений.
 *
 * @returns {Record<string, number>} Отпечаток нарушения -> разрешённое число повторов.
 */
function readBaseline() {
    if (!existsSync(BASELINE)) {
        return {};
    }

    return JSON.parse(readFileSync(BASELINE, 'utf8')).violations ?? {};
}

const updateBaseline = process.argv.includes('--update-baseline');
const dirArgument = flagValue('--dir');
const scanRoot = dirArgument ? resolve(ROOT, dirArgument) : SCAN_DIR;

if (dirArgument && updateBaseline) {
    console.log('--dir и --update-baseline вместе не работают: бюджет пишется только по src/app.');
    process.exit(2);
}

if (!existsSync(scanRoot)) {
    console.log('Каталог для сканирования не найден: ' + rel(scanRoot));
    process.exit(2);
}

const ancestors = [];
const hits = [];

for (const file of collectLess(scanRoot)) {
    const path = rel(file);

    if (!dirArgument && (path === GLOBAL_PREFIX || path.startsWith(GLOBAL_PREFIX + '/'))) {
        continue;
    }

    const scanned = scanFile(file, path);

    ancestors.push(...scanned.ancestors);
    hits.push(...scanned.hits);
}

if (ancestors.length) {
    console.log('Селекторы компонентных стилей с внешним предком не матчатся никогда:');

    for (const item of ancestors) {
        console.log('  ' + item.path + ':' + item.line + ': ' + item.selector);
    }

    console.log('Реакция на классы body/html — :host-context(body.класс) .элемент, см. game-chat-widget.');
    process.exit(1);
}

/** Отпечаток нарушения складывается из проверки, пути и нормализованной детали. */
const buckets = new Map();

for (const hit of hits) {
    const key = hit.check + '|' + hit.path + '|' + hit.detail;

    if (buckets.has(key)) {
        buckets.get(key).push(hit);
    } else {
        buckets.set(key, [hit]);
    }
}

if (updateBaseline) {
    const violations = {};

    for (const key of [...buckets.keys()].sort()) {
        violations[key] = buckets.get(key).length;
    }

    const payload = {
        note: 'Бюджет легаси-нарушений компонентных стилей (hexColour, bareImportant, literalZIndex). Новые нарушения валит node scripts/check-component-styles.mjs.',
        updatedAt: new Date().toISOString().slice(0, 10),
        total: hits.length,
        violations,
    };

    const serialized = JSON.stringify(payload, null, 4) + '\n';

    // --stdout нужен там, где прямое письмо на диск запрещено (агентские песочницы, CI-обёртки).
    if (process.argv.includes('--stdout')) {
        process.stdout.write(serialized);
    } else {
        writeFileSync(BASELINE, serialized);
        console.log('Бейзлайн обновлён: ' + hits.length + ' известных нарушений -> ' + rel(BASELINE));
    }

    process.exit(0);
}

const baseline = readBaseline();
const fresh = [];
let budgeted = 0;

for (const [key, bucket] of buckets) {
    const allowed = baseline[key] ?? 0;

    budgeted += Math.min(allowed, bucket.length);

    if (bucket.length > allowed) {
        fresh.push(...bucket.slice(allowed));
    }
}

const stale = Object.entries(baseline).reduce(
    (sum, [key, allowed]) => sum + Math.max(0, allowed - (buckets.get(key)?.length ?? 0)),
    0
);

if (fresh.length) {
    console.log('Новые нарушения компонентных стилей:');

    for (const hit of fresh) {
        console.log(hit.path + ':' + hit.line + '  ' + hit.check + '  ' + hit.detail);
    }

    console.log('');
    console.log('Цвета, !important и z-index — только токенами --lh-*, см. docs/DESIGN_SYSTEM.md.');
}

console.log('Компонентные стили: новых нарушений ' + fresh.length + ', в бюджете ' + budgeted + '.');

if (stale > 0) {
    console.log('Бейзлайн можно сократить на ' + stale + ' (--update-baseline)');
}

process.exit(fresh.length > 0 ? 1 : 0);
