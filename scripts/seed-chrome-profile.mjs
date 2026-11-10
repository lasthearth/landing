#!/usr/bin/env node
/*
 * Готовит профиль Chrome для скриншотов и визуальных проверок.
 *
 * Первый визит показывает welcome-оверлей и баннер согласия на аналитику —
 * они перекрывают страницу, и скриншот снимает их, а не контент. Скрипт
 * открывает origin в headless Chrome с указанным профилем и записывает в
 * localStorage:
 *   lh_welcome_seen      = 'true'   — welcome больше не показывается;
 *   lh-analytics-consent = 'false'  — баннер согласия скрыт (отказ).
 *
 * Запуск:
 *   node scripts/seed-chrome-profile.mjs [origin] [profileDir] [ключ=значение …]
 *   origin     — по умолчанию http://127.0.0.1:4200
 *   profileDir — по умолчанию .taste-skill/chrome-shoot (в gitignore)
 *   Доп. пары записываются тем же вызовом: lh-theme="light".
 *
 * Профиль закрывается через Browser.close и досыпает данные в leveldb;
 * жёсткий kill терял запись (см. docs/TRAPS.md, «Скриншоты на свежем профиле»).
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const origin = process.argv[2] || 'http://127.0.0.1:4200';
const profile = path.resolve(process.argv[3] || '.taste-skill/chrome-shoot');
fs.mkdirSync(profile, { recursive: true });

/** Ищет Chrome/macOS/Chromium в стандартных местах. */
function chromeBin() {
    const candidates =
        process.platform === 'darwin'
            ? [
                  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                  '/Applications/Chromium.app/Contents/MacOS/Chromium',
                  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
              ]
            : ['google-chrome', 'chromium', 'chromium-browser'];

    for (const candidate of candidates) {
        try {
            if (candidate.includes('/')) {
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            } else {
                return execSync(`command -v ${candidate}`).toString().trim();
            }
        } catch {
            // кандидата нет — проверяем следующий
        }
    }

    throw new Error('Chrome не найден: задайте путь в CHROME_BIN');
}

const port = 9333;
const chrome = spawn(process.env.CHROME_BIN || chromeBin(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ждёт страницу DevTools-цели. */
async function pageTarget() {
    for (let i = 0; i < 40; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
            const page = list.find((target) => target.type === 'page');

            if (page) {
                return page;
            }
        } catch {
            // DevTools ещё не поднялся — ждём
        }

        await sleep(250);
    }

    throw new Error('DevTools-эндпоинт не поднялся');
}

const page = await pageTarget();
const socket = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
    }
};

const send = (method, params = {}) =>
    new Promise((resolve) => {
        const id = ++seq;

        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
    });

await new Promise((resolve) => (socket.onopen = resolve));
await send('Page.enable');
await send('Page.navigate', { url: origin + '/' });
await sleep(2500);

const pairs = [
    ['lh_welcome_seen', 'true'],
    ['lh-analytics-consent', 'false'],
    ...process.argv.slice(4).map((pair) => pair.split('=')),
];
const expression = pairs
    .map(([key, value]) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`)
    .join('');

const result = await send('Runtime.evaluate', {
    expression: expression + 'JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("lh-") && !key.startsWith("lh_game_chat_"))))',
    returnByValue: true,
});

console.log('записано:', result.result?.result?.value);

// Мягкое закрытие: kill на живом процессе терял данные в leveldb.
await send('Browser.close');
const exited = new Promise((resolve) => chrome.once('exit', resolve));
await Promise.race([exited, sleep(5000)]);

if (chrome.exitCode === null) {
    chrome.kill();
}

process.exit(0);
