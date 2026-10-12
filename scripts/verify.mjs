/**
 * Единая проверка проекта перед коммитом.
 *
 * Собирает всё, что нужно прогонять после правки: формат агентских документов, бюджет
 * контекста, живость указателей, границы FSD, паритет локалей, контраст токенов и типы.
 * Полный прогон добавляет сборку и тесты.
 *
 * Запуск:
 *   node scripts/verify.mjs          — быстрый минимум (работает и в песочнице)
 *   node scripts/verify.mjs --full   — плюс ng build и ng test (нужен браузер)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Полный прогон со сборкой и тестами. */
const FULL = process.argv.includes('--full');

/**
 * Ищет установленный Chrome: Karma без браузера не стартует.
 *
 * @returns {string | null} Путь к браузеру или null.
 */
function findChrome() {
    if (process.env.CHROME_BIN) {
        return process.env.CHROME_BIN;
    }

    const candidates = [
        join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
        join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
        join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    ];

    return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
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
    { name: 'Формат агентских документов', args: ['node_modules/prettier/bin/prettier.cjs', '--check', ...formatTargets()] },
    { name: 'Бюджет контекста', args: ['scripts/check-context-budget.mjs'] },
    { name: 'Живость указателей', args: ['scripts/check-doc-pointers.mjs'] },
    { name: 'Границы FSD', args: ['scripts/check-architecture.mjs'] },
    { name: 'Паритет локалей', args: ['scripts/i18n-tool.mjs', 'check'] },
    { name: 'Контраст токенов', args: ['scripts/check-contrast.mjs'] },
    { name: 'Типы', args: ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.app.json', '--noEmit'] },
];

if (FULL) {
    const chrome = findChrome();

    steps.push({ name: 'Сборка (ng build)', args: ['node_modules/@angular/cli/bin/ng', 'build'] });

    if (chrome) {
        process.env.CHROME_BIN = chrome;
        steps.push({
            name: 'Тесты (Karma + ChromeHeadless)',
            args: ['node_modules/@angular/cli/bin/ng', 'test', '--watch=false', '--browsers=ChromeHeadless'],
        });
    } else {
        console.log('Пропуск тестов: Chrome не найден (задайте CHROME_BIN) — Karma без браузера не стартует.');
    }
}

const results = [];
const started = Date.now();

for (const step of steps) {
    const at = Date.now();
    const run = spawnSync(process.execPath, step.args, { cwd: ROOT, stdio: 'inherit' });
    const seconds = ((Date.now() - at) / 1000).toFixed(1);
    const ok = run.status === 0;

    results.push({ name: step.name, ok, seconds });

    if (!ok && run.error) {
        console.log('  не удалось запустить шаг: ' + run.error.message);
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
    process.exit(1);
}

console.log('');
console.log('Всё зелёное за ' + ((Date.now() - started) / 1000).toFixed(1) + ' с.');
