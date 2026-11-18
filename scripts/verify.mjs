/**
 * Единая проверка проекта перед коммитом.
 *
 * Собирает всё, что нужно прогонять после правки: состояние `node_modules`, формат
 * агентских документов, бюджет контекста, живость указателей, границы FSD, паритет
 * локалей, контраст токенов, типы и ESLint. Полный прогон добавляет сборку и тесты.
 *
 * Весь прогон держит замок сборки (`.build.lock`): параллельный `verify` или `npm run
 * build` падает сразу, а не ломает чужой `dist`.
 *
 * Запуск:
 *   node scripts/verify.mjs          — быстрый минимум (работает и в песочнице)
 *   node scripts/verify.mjs --full   — плюс ng build, Vitest и тесты холста в Chrome (если он найден)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireBuildLock } from './lib/build-lock.mjs';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Полный прогон со сборкой и тестами. */
const FULL = process.argv.includes('--full');

/** Исполняемый файл npm: на Windows это `npm.cmd`. */
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Ищет браузер, которым Playwright запускает браузерные спеки.
 *
 * Браузер из `npx playwright install chromium` лежит в кэше Playwright. Если его
 * нет, браузерный прогон не стартует, поэтому шаг пропускается с подсказкой.
 *
 * @returns {boolean} true, если браузер установлен.
 */
function hasPlaywrightBrowser() {
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache', 'ms-playwright')].filter(Boolean);
    const macCache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
    roots.push(macCache);

    for (const root of roots) {
        if (!existsSync(root)) {
            continue;
        }

        if (readdirSync(root).some((entry) => entry.startsWith('chromium'))) {
            return true;
        }
    }

    return false;
}

/**
 * Собирает список агентских документов для проверки формата.
 *
 * Архив исключён: там одноразовые артефакты прошлых работ, их формат не поддерживаем.
 *
 * @returns {string[]} Пути для prettier.
 */
function formatTargets() {
    // scripts/ исключён: prettier не может писать туда в агентских песочницах.
    // В обычном терминале формат скриптов правится командой npx prettier --write scripts.
    const files = ['AGENTS.md', 'AGENT_RULES_MAP.md', 'README.md', 'package.json'];
    const docs = join(ROOT, 'docs');

    if (existsSync(docs)) {
        for (const entry of readdirSync(docs)) {
            // project-map.md генерируется: его формат задаёт генератор, а не prettier.
            if (entry.endsWith('.md') && entry !== 'project-map.md') {
                files.push(join('docs', entry));
            }
        }
    }

    return files;
}

/** Шаги проверки. */
const steps = [
    // Окружение: пакет из package.json, которого нет в node_modules, иначе всплывает
    // через два шага невнятной ошибкой `TS2307 Cannot find module`.
    { name: 'Окружение (node_modules против package.json)', cmd: 'npm', args: ['ls', '--depth=0'], quiet: true },
    {
        name: 'Формат агентских документов',
        args: ['node_modules/prettier/bin/prettier.cjs', '--check', ...formatTargets()],
    },
    { name: 'Бюджет контекста', args: ['scripts/check-context-budget.mjs'] },
    { name: 'Живость указателей', args: ['scripts/check-doc-pointers.mjs'] },
    { name: 'Границы FSD', args: ['scripts/check-architecture.mjs'] },
    { name: 'Паритет локалей', args: ['scripts/i18n-tool.mjs', 'check'] },
    { name: 'Контраст токенов', args: ['scripts/check-contrast.mjs'] },
    { name: 'Объявление токенов', args: ['scripts/check-design-tokens.mjs'] },
    // Компонентный стиль с селектором от body/html молча не матчится (инкапсуляция).
    { name: 'Предки компонентных стилей', args: ['scripts/check-component-styles.mjs'] },
    // ngc, а не голый tsc: ошибки типов в шаблонах (TS4104 на привязках) tsc не видит.
    {
        name: 'Типы (TS и шаблоны)',
        args: ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.app.json', '--noEmit'],
    },
    // Держит жёсткое правило 11: `any` и `console.log` не проходят проверку.
    { name: 'ESLint', args: ['node_modules/eslint/bin/eslint.js', 'src', 'eslint.config.mjs'] },
];

if (FULL) {
    steps.push({ name: 'Сборка (ng build)', args: ['node_modules/@angular/cli/bin/ng', 'build'] });
    steps.push({ name: 'Тесты (Vitest + jsdom)', args: ['node_modules/@angular/cli/bin/ng', 'test', '--watch=false'] });

    if (hasPlaywrightBrowser()) {
        steps.push({
            name: 'Тесты холста (Vitest в Chromium)',
            args: ['node_modules/@angular/cli/bin/ng', 'run', 'last-hearth-landing:test-browser'],
        });
    } else {
        console.log(
            'Пропуск тестов холста: нет браузера Playwright. Установите его командой npx playwright install chromium.'
        );
    }
}

const results = [];
const started = Date.now();
// Замок на весь прогон: шаги `--full` пишут в `dist/`, а второй такой прогон рядом
// не должен этого делать. Дочерние шаги видят `LH_BUILD_LOCK_HELD` и не берут замок.
const releaseBuildLock = acquireBuildLock(FULL ? 'verify:full' : 'verify');

for (const step of steps) {
    const at = Date.now();
    const run = spawnSync(step.cmd === 'npm' ? NPM_BIN : process.execPath, step.args, {
        cwd: ROOT,
        stdio: step.quiet ? 'pipe' : 'inherit',
        encoding: 'utf8',
    });
    const seconds = ((Date.now() - at) / 1000).toFixed(1);
    const ok = run.status === 0;

    results.push({ name: step.name, ok, seconds });

    if (!ok && run.error) {
        console.log('  не удалось запустить шаг: ' + run.error.message);
    }

    if (!ok && step.quiet) {
        const lines = String(run.stdout ?? '')
            .split('\n')
            .filter((line) => /UNMET|invalid|missing|extraneous|ERR/.test(line))
            .slice(0, 10);

        for (const line of lines) {
            console.log('  ' + line.trim());
        }

        console.log('  лечится командой npm ci (или npm run bootstrap в worktree)');
    }
}

console.log('');
console.log('| Шаг | Результат | Секунды |');
console.log('|---|---|---|');

for (const result of results) {
    console.log('| ' + result.name + ' | ' + (result.ok ? 'ок' : 'ПАДЕНИЕ') + ' | ' + result.seconds + ' |');
}

const failed = results.filter((result) => !result.ok);

if (failed.length) {
    console.log('');
    console.log('Провалилось шагов: ' + failed.length + ' -> ' + failed.map((item) => item.name).join(', '));
    console.log('Полное время: ' + ((Date.now() - started) / 1000).toFixed(1) + ' с.');
    releaseBuildLock();
    process.exit(1);
}

console.log('');
console.log('Всё зелёное за ' + ((Date.now() - started) / 1000).toFixed(1) + ' с.');
releaseBuildLock();
