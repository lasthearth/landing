/**
 * Запуск ESLint с бейзлайном легаси-нарушений.
 *
 * Зачем прослойка: правила против «слопа» (`eslint.config.mjs`) включаются
 * ошибками сразу, но старый код их нарушает. Переписывать сотни мест за один
 * заход — риск сломать поведение. Бейзлайн фиксирует то, что уже есть
 * (`scripts/lint-baseline.json`), а любое НОВОЕ нарушение валит проверку.
 * Тот же приём, что у `scripts/architecture-baseline.json`.
 *
 * Ключ записи — `правило|файл|текст сообщения`: он переживает сдвиг строк,
 * поэтому бейзлайн не гниёт от правок в других местах файла.
 *
 * Запуск:
 *   node scripts/lint.mjs                     — проверка, код возврата 1 при новом нарушении
 *   node scripts/lint.mjs --fix               — сначала автоисправления, потом проверка
 *   node scripts/lint.mjs --update-baseline   — перезаписать бейзлайн текущим состоянием
 *
 * Бейзлайн может только уменьшаться: правку, которая убрала легаси-нарушение,
 * видно по строке «бейзлайн можно сократить».
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Файл с зафиксированными легаси-нарушениями. */
const BASELINE = resolve(ROOT, 'scripts', 'lint-baseline.json');

/** Что проверяем: тот же набор, что был у `eslint src eslint.config.mjs`. */
const TARGETS = ['src', 'eslint.config.mjs'];

/** Автоисправления перед проверкой. */
const FIX = process.argv.includes('--fix');

/** Перезапись бейзлайна. */
const UPDATE = process.argv.includes('--update-baseline');

/**
 * Ключ нарушения для бейзлайна.
 *
 * @param filePath Абсолютный путь файла.
 * @param message Сообщение правила.
 * @param ruleId Идентификатор правила.
 * @returns {string} Ключ `правило|путь от корня|сообщение`.
 */
function baselineKey(filePath, message, ruleId) {
    return [ruleId, relative(ROOT, filePath).split('\\').join('/'), message.replace(/\s+/g, ' ')].join('|');
}

/**
 * Читает бейзлайн: ключ → сколько раз это нарушение разрешено.
 *
 * @returns {Map<string, number>} Разрешённые нарушения.
 */
function readBaseline() {
    if (!existsSync(BASELINE)) {
        return new Map();
    }

    const payload = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const allowed = new Map();

    for (const [key, count] of Object.entries(payload.violations ?? {})) {
        allowed.set(key, Number(count));
    }

    return allowed;
}

/**
 * Запускает ESLint в текущем каталоге.
 *
 * @returns {Promise<import('eslint').ESLint.LintResult[]>} Результаты по файлам.
 */
async function lint() {
    const eslint = new ESLint({ cwd: ROOT, fix: FIX });

    return eslint.lintFiles(TARGETS);
}

/**
 * Печатает нарушения в формате stylish, но только те, которых нет в бейзлайне.
 *
 * @param results Результаты ESLint.
 * @param allowed Бейзлайн.
 * @returns {{fresh: number, suppressed: number, stale: number}} Счётчики.
 */
async function report(results, allowed) {
    const budget = new Map(allowed);
    const kept = [];
    let suppressed = 0;

    for (const result of results) {
        const messages = [];

        for (const message of result.messages) {
            if (message.severity !== 2 || !message.ruleId) {
                messages.push(message);
                continue;
            }

            const key = baselineKey(result.filePath, message.message, message.ruleId);
            const left = budget.get(key) ?? 0;

            if (left > 0) {
                budget.set(key, left - 1);
                suppressed += 1;
                continue;
            }

            messages.push(message);
        }

        kept.push({ ...result, messages });
    }

    const fresh = kept.reduce((sum, result) => sum + result.messages.filter((message) => message.severity === 2).length, 0);
    const stale = [...budget.values()].reduce((sum, left) => sum + left, 0);

    if (fresh > 0) {
        const eslint = new ESLint({ cwd: ROOT });
        const formatter = await eslint.loadFormatter('stylish');
        process.stdout.write(await formatter.format(kept));
    }

    return { fresh, suppressed, stale };
}

/**
 * Перезаписывает бейзлайн текущим состоянием кода.
 *
 * @param results Результаты ESLint.
 * @returns {number} Сколько нарушений записано.
 */
function updateBaseline(results) {
    const counts = new Map();

    for (const result of results) {
        for (const message of result.messages) {
            if (message.severity !== 2 || !message.ruleId) {
                continue;
            }

            const key = baselineKey(result.filePath, message.message, message.ruleId);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    const violations = Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
    const payload = {
        note: 'Легаси-нарушения правил против слопа. Новые нарушения валит node scripts/lint.mjs. Только сокращать.',
        updatedAt: new Date().toISOString().slice(0, 10),
        total: counts.size ? [...counts.values()].reduce((sum, count) => sum + count, 0) : 0,
        violations,
    };

    writeFileSync(BASELINE, JSON.stringify(payload, null, 4) + '\n');

    return payload.total;
}

const results = await lint();

if (FIX) {
    await ESLint.outputFixes(results);
}

if (UPDATE) {
    const total = updateBaseline(results);
    console.log(`Бейзлайн обновлён: ${total} нарушений в ${relative(ROOT, BASELINE)}.`);
    process.exit(0);
}

const { fresh, suppressed, stale } = await report(results, readBaseline());

console.log(`Легаси-нарушений подавлено бейзлайном: ${suppressed}.`);

if (stale > 0) {
    console.log(`Бейзлайн можно сократить на ${stale}: этих нарушений в коде больше нет (node scripts/lint.mjs --update-baseline).`);
}

if (fresh > 0) {
    console.error(`Новых нарушений: ${fresh}. Это слоп: почините код, а не бейзлайн.`);
    process.exit(1);
}

console.log('Новых нарушений нет.');