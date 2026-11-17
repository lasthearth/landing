/**
 * Визуальная проверка живого dev-сервера в настоящем Chrome: скриншот области
 * страницы без ручной разметки временных файлов.
 *
 * Запуск:
 *   node scripts/visual-check.mjs --url '/settlements?nowelcome' --out /tmp/shot.png
 *   node scripts/visual-check.mjs --width 390 --clip 500 --auth --out /tmp/m.png
 *
 * Флаги:
 *   --url    путь на dev-сервере (по умолчанию '/?nowelcome');
 *   --width  ширина вьюпорта, px (по умолчанию 1440);
 *   --clip   высота области скриншота от верха, px (по умолчанию 560);
 *   --auth   подставить вход игрока в состояние шапки (имя ripls, баланс, аватар);
 *   --out    файл скриншота (обязательный).
 */
import { chromium } from 'playwright';

/**
 * Разбирает аргументы командной строки в объект флагов.
 *
 * @param argv Аргументы процесса без node и пути скрипта.
 * @returns Объект флагов со строковыми значениями.
 */
function parseArgs(argv) {
    const flags = {};

    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i].startsWith('--')) {
            flags[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? 'true' : argv[i + 1];
        }
    }

    return flags;
}

const flags = parseArgs(process.argv.slice(2));

if (!flags.out) {
    console.error('Нужен флаг --out с путём скриншота.');
    process.exit(1);
}

const width = Number(flags.width ?? 1440);
const clip = Number(flags.clip ?? 560);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width, height: Math.max(clip, 700) } });

await page.goto(`http://127.0.0.1:4200${flags.url ?? '/?nowelcome'}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.crown__strip');

if (flags.auth) {
    /* Вход без бэкенда: состояние шапки подменяется прокси поверх сигналов. */
    await page.evaluate(() => {
        const ng = window.ng;
        const component = ng.getComponent(document.querySelector('app-header-crown'));
        const original = component.state;

        component.state = new Proxy(original, {
            get(target, key) {
                if (key === 'isAuth') return () => true;
                if (key === 'authKnown') return () => true;
                if (key === 'userName') return () => 'ripls';
                if (key === 'userImage') return () => '/images/logo.webp';
                if (key === 'userId') return () => null;
                if (key === 'coins') return () => '9999100';
                if (key === 'attention') return () => false;

                const value = Reflect.get(target, key);

                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
        ng.applyChanges(component);
    });
}

await page.waitForTimeout(800);
await page.screenshot({ path: flags.out, clip: { x: 0, y: 0, width, height: clip } });
console.log(`Скриншот: ${flags.out} (${width}x${clip})`);

await browser.close();
