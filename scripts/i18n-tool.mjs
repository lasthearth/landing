/**
 * Инструмент для i18n-словарей: точечное чтение и правка без открытия файла целиком.
 *
 * Зачем: самый большой словарь (rules.i18n.ts) — 222 kB. Правка одной строки через
 * чтение файла стоит десятки тысяч токенов, через этот инструмент — одну команду.
 *
 * Команды:
 *   node scripts/i18n-tool.mjs stats [--check]            — размеры, ключи, паритет ru/en
 *   node scripts/i18n-tool.mjs find <подстрока>           — где встречается ключ или текст
 *   node scripts/i18n-tool.mjs get <файл> <путь>          — значения ключа
 *   node scripts/i18n-tool.mjs set <файл> <путь> <текст> [--lang ru|en|both] [--print]
 *
 * <файл> — имя домена (rules, faq, home) или путь к .i18n.ts.
 * <путь> — ключи через точку, например rules.title или faq.questions.offer.
 * --print печатает обновлённый файл в stdout вместо записи (для песочниц, где письмо запрещено).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Каталог словарей. */
const DICT_DIR = join(ROOT, 'src', 'app', 'core', 'i18n', 'translations', 'features');

/** Аргументы командной строки. */
const argv = process.argv.slice(2);

/** Команда. */
const command = argv[0];

/**
 * Достаёт литерал объекта словаря из исходника.
 *
 * @param {string} source Текст .i18n.ts.
 * @returns {string} Текст литерала вместе с внешними скобками.
 */
function literalOf(source) {
    const declaration = /export const \w+\s*=\s*/.exec(source);
    const brace = declaration ? source.indexOf('{', declaration.index + declaration[0].length) : source.indexOf('= {') + 2;

    // Закрывающая скобка литерала стоит в начале строки — так словари и отформатированы.
    // Поиск от конца устойчив к фигурным скобкам внутри комментариев и строк.
    if (brace !== -1) {
        const tail = source.lastIndexOf('\n};');

        if (tail > brace) {
            return source.slice(brace, tail + 2);
        }
    }

    const start = brace === -1 ? source.indexOf('= {') : brace - 2;

    if (start === -1) {
        throw new Error('в файле нет литерала словаря (= { ... })');
    }

    let depth = 0;
    let quote = null;

    for (let i = start + 2; i < source.length; i += 1) {
        const char = source[i];

        if (quote) {
            if (char === '\\\\') {
                i += 1;
            } else if (char === quote) {
                quote = null;
            }

            continue;
        }

        if (char === "'" || char === '"' || char === '\u0060') {
            quote = char;
        } else if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;

            if (depth === 0) {
                return source.slice(start + 2, i + 1);
            }
        }
    }

    throw new Error('литерал словаря не закрыт');
}

/**
 * Разбирает литерал словаря в объект.
 *
 * @param {string} literal Текст литерала.
 * @returns {Record<string, unknown>} Значение словаря.
 */
function parseDictionary(literal) {
    return new Function('return (' + literal + ');')();
}

/**
 * Разворачивает словарь в плоский список путей.
 *
 * @param {unknown} node Текущий узел.
 * @param {string} prefix Накопленный путь.
 * @returns {{ path: string, value: unknown }[]} Листья словаря.
 */
function flatten(node, prefix = '') {
    if (node === null || typeof node !== 'object') {
        return [{ path: prefix.replace(/\.$/, ''), value: node }];
    }

    return Object.entries(node).flatMap(([key, value]) => flatten(value, prefix + key + '.'));
}

/**
 * Загружает словарь из файла.
 *
 * @param {string} file Путь к .i18n.ts.
 * @returns {{ source: string, literal: string, dict: Record<string, unknown> }} Исходник и разобранный словарь.
 */
function load(file) {
    const source = readFileSync(file, 'utf8');
    const literal = literalOf(source);

    return { source, literal, dict: parseDictionary(literal) };
}

/**
 * Определяет список словарей для команд без явного файла.
 *
 * @returns {string[]} Пути к .i18n.ts.
 */
function allDicts() {
    return readdirSync(DICT_DIR)
        .filter((name) => name.endsWith('.i18n.ts'))
        .map((name) => join(DICT_DIR, name));
}

/**
 * Разрешает аргумент-файл в путь словаря.
 *
 * @param {string} value Имя домена или путь.
 * @returns {string} Абсолютный путь.
 */
function resolveDict(value) {
    if (existsSync(value)) {
        return resolve(value);
    }

    const candidate = join(DICT_DIR, value.replace(/\.i18n\.ts$/, '') + '.i18n.ts');

    if (existsSync(candidate)) {
        return candidate;
    }

    throw new Error('словарь не найден: ' + value);
}

/**
 * Находит диапазоны строковых литералов значений по путям.
 *
 * @param {string} literal Текст литерала.
 * @returns {Map<string, { start: number, end: number }>} Путь -> позиция литерала в тексте.
 */
function valueRanges(literal) {
    const ranges = new Map();
    const stack = [{ type: 'object', path: [], pending: null, index: 0 }];
    let i = 0;

    /** Текущая вершина стека. */
    const top = () => stack[stack.length - 1];

    /** Путь нового контейнера. */
    const childPath = () => {
        const frame = top();

        if (frame.type === 'array') {
            return frame.path.concat(String(frame.index));
        }

        return frame.pending === null ? frame.path : frame.path.concat(frame.pending);
    };

    /** Помечает элемент контейнера обработанным. */
    const consume = () => {
        const frame = top();

        if (frame.type === 'array') {
            frame.index += 1;
        } else {
            frame.pending = null;
        }
    };

    while (i < literal.length) {
        const char = literal[i];

        if (char === '/' && literal[i + 1] === '/') {
            while (i < literal.length && literal[i] !== '\n') {
                i += 1;
            }

            continue;
        }

        if (char === "'" || char === '"' || char === '\u0060') {
            const quote = char;
            const start = i;
            i += 1;

            while (i < literal.length) {
                if (literal[i] === '\\\\') {
                    i += 2;

                    continue;
                }

                if (literal[i] === quote) {
                    break;
                }

                i += 1;
            }

            const end = i + 1;
            const raw = literal.slice(start, end);
            let after = end;

            while (after < literal.length && /\s/.test(literal[after])) {
                after += 1;
            }

            const isKey = literal[after] === ':';
            const frame = top();

            if (isKey) {
                if (frame.type === 'object') {
                    frame.pending = raw.slice(1, -1);
                }
            } else {
                const path = frame.path.concat(frame.type === 'array' ? String(frame.index) : frame.pending ?? '');
                ranges.set(path.join('.'), { start, end });
                consume();
            }

            i = end;

            continue;
        }

        if (char === '{' || char === '[') {
            stack.push({
                type: char === '{' ? 'object' : 'array',
                path: childPath(),
                pending: null,
                index: 0,
            });
            i += 1;

            continue;
        }

        if (char === '}' || char === ']') {
            stack.pop();
            consume();
            i += 1;

            continue;
        }

        if (char === ':') {
            const frame = top();

            if (frame.type === 'object' && frame.pending === null) {
                let back = i - 1;

                while (back >= 0 && /\s/.test(literal[back])) {
                    back -= 1;
                }

                let word = '';

                while (back >= 0 && /[\w$-]/.test(literal[back])) {
                    word = literal[back] + word;
                    back -= 1;
                }

                frame.pending = word;
            }

            i += 1;

            continue;
        }

        i += 1;
    }

    return ranges;
}

/**
 * Находит путь значения в исходнике с учётом языка.
 *
 * @param {Map<string, { start: number, end: number }>} ranges Карта диапазонов.
 * @param {string} path Путь без языка (например rules.title).
 * @param {string} lang Язык.
 * @returns {{ start: number, end: number } | undefined} Диапазон литерала.
 */
function rangeFor(ranges, path, lang) {
    return ranges.get(lang + '.' + path) ?? ranges.get(path);
}

if (command === 'stats' || command === 'check') {
    const check = command === 'check' || argv.includes('--check');
    let failed = false;

    console.log('| Словарь | kB | ключей ru | ключей en | только ru | только en |');
    console.log('|---|---|---|---|---|---|');

    for (const file of allDicts()) {
        const { dict } = load(file);
        const ru = new Set(flatten(dict.ru).map((item) => item.path));
        const en = new Set(flatten(dict.en).map((item) => item.path));
        const onlyRu = [...ru].filter((key) => !en.has(key));
        const onlyEn = [...en].filter((key) => !ru.has(key));
        const name = file.split(/[\\/]/).pop().replace('.i18n.ts', '');

        console.log(
            '| ' +
                name +
                ' | ' +
                (readFileSync(file).length / 1024).toFixed(1) +
                ' | ' +
                ru.size +
                ' | ' +
                en.size +
                ' | ' +
                onlyRu.length +
                ' | ' +
                onlyEn.length +
                ' |'
        );

        if (check && (onlyRu.length || onlyEn.length)) {
            failed = true;
            console.log('  ' + name + ': без английского ' + (onlyRu.join(', ') || '—'));
            console.log('  ' + name + ': без русского ' + (onlyEn.join(', ') || '—'));
        }
    }

    process.exit(check && failed ? 1 : 0);
}

if (command === 'find') {
    const needle = (argv[1] ?? '').toLowerCase();

    if (!needle) {
        console.error('укажите подстроку: node scripts/i18n-tool.mjs find <подстрока>');
        process.exit(2);
    }

    for (const file of allDicts()) {
        const { dict } = load(file);
        const name = file.split(/[\\/]/).pop().replace('.i18n.ts', '');

        for (const item of flatten(dict.ru)) {
            const text = typeof item.value === 'string' ? item.value : '';

            if (item.path.toLowerCase().includes(needle) || text.toLowerCase().includes(needle)) {
                const trimmed = text.length > 80 ? text.slice(0, 80) + '…' : text;

                console.log(name + '.' + item.path + '  =  ' + trimmed);
            }
        }
    }

    process.exit(0);
}

if (command === 'get') {
    const file = resolveDict(argv[1] ?? '');
    const path = argv[2] ?? '';
    const { dict } = load(file);
    const value = (lang) =>
        path.split('.').reduce((node, key) => (node === undefined || node === null ? undefined : node[key]), dict[lang]);

    console.log('ru: ' + JSON.stringify(value('ru')));
    console.log('en: ' + JSON.stringify(value('en')));
    console.log('файл: ' + file);
    process.exit(0);
}

if (command === 'set') {
    const file = resolveDict(argv[1] ?? '');
    const path = argv[2] ?? '';
    const text = argv[3] ?? '';
    const langIndex = argv.indexOf('--lang');
    const lang = langIndex === -1 ? 'both' : argv[langIndex + 1];
    const targets = lang === 'both' ? ['ru', 'en'] : [lang];
    const { source, literal } = load(file);
    const ranges = valueRanges(literal);
    const offset = source.indexOf(literal);
    let updated = source;

    if (!path) {
        console.error('укажите путь ключа: node scripts/i18n-tool.mjs set <файл> <путь> <текст>');
        process.exit(2);
    }

    for (const target of targets) {
        const range = rangeFor(ranges, path, target);

        if (!range) {
            console.error('ключ не найден в ' + target + ': ' + path);
            process.exit(1);
        }

        const abs = { start: offset + range.start, end: offset + range.end };
        const serialized = JSON.stringify(text).replace(/^"|"$/g, '').replace(/\\'/g, "\\\\'");
        const replacement = "'" + serialized + "'";

        updated = updated.slice(0, abs.start) + replacement + updated.slice(abs.end);

        // Позиции остальных диапазонов сдвигаются на разницу длин.
        const delta = replacement.length - (range.end - range.start);

        for (const [key, item] of ranges) {
            if (item.start > range.start) {
                ranges.set(key, { start: item.start + delta, end: item.end + delta });
            }
        }
    }

    const check = parseDictionary(literalOf(updated));
    const ru = new Set(flatten(check.ru).map((item) => item.path));
    const en = new Set(flatten(check.en).map((item) => item.path));
    const gap = [...ru].filter((key) => !en.has(key)).concat([...en].filter((key) => !ru.has(key)));

    if (argv.includes('--print')) {
        process.stdout.write(updated);
    } else {
        writeFileSync(file, updated);
        console.log('обновлено: ' + file + ' -> ' + targets.join('/') + ' : ' + path);
    }

    if (gap.length) {
        console.log('внимание: локали расходятся по ключам: ' + gap.join(', '));
    }

    process.exit(0);
}

if (command === 'remove') {
    const file = resolveDict(argv[1] ?? '');
    const paths = argv.slice(2).filter((item) => !item.startsWith('--'));
    const { source, literal } = load(file);
    const ranges = valueRanges(literal);
    const offset = source.indexOf(literal);
    const cuts = [];
    const missed = [];

    for (const keyPath of paths) {
        for (const lang of ['ru', 'en']) {
            const range = rangeFor(ranges, keyPath, lang);

            if (!range) {
                missed.push(lang + '.' + keyPath);

                continue;
            }

            const lineStart = source.lastIndexOf('\n', offset + range.start) + 1;
            const lineEnd = source.indexOf('\n', offset + range.end);
            const lineText = source.slice(lineStart, lineEnd);

            // Удаляем только простые однострочные строки: сложные конструкции не трогаем.
            if (!/^\s*[A-Za-z_$][\w$]*:\s*'[^']*',?\s*$/.test(lineText)) {
                missed.push('сложная запись: ' + lang + '.' + keyPath);

                continue;
            }

            cuts.push([lineStart, lineEnd + 1]);
        }
    }

    cuts.sort((a, b) => b[0] - a[0]);

    let updated = source;

    for (const [start, end] of cuts) {
        updated = updated.slice(0, start) + updated.slice(end);
    }

    const check = parseDictionary(literalOf(updated));
    const ruKeys = new Set(flatten(check.ru).map((item) => item.path));
    const enKeys = new Set(flatten(check.en).map((item) => item.path));
    const gap = [...ruKeys].filter((key) => !enKeys.has(key)).concat([...enKeys].filter((key) => !ruKeys.has(key)));

    if (argv.includes('--print')) {
        process.stdout.write(updated);
    } else {
        writeFileSync(file, updated);
        console.log('удалено записей: ' + cuts.length + ' (' + paths.length + ' ключей) -> ' + basename(file));
    }

    if (missed.length > 0) {
        console.log('не тронуто: ' + missed.join(', '));
    }

    if (gap.length > 0) {
        console.log('ВНИМАНИЕ: локали разошлись по ключам: ' + gap.join(', '));
    }

    process.exit(0);
}

console.error('команды: stats | check | find | get | set | remove');
process.exit(2);
