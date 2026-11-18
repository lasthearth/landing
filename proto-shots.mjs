// ПРОТОТИП, НЕ ПРОДАКШН: скриншоты вариантов панели сортировки для сравнения.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const shots = [
    { variant: 'base', click: null },
    { variant: 'menu', click: '.proto-menu__btn' },
    { variant: 'rail', click: null },
    { variant: 'inline', click: '.proto-inline__filters' },
];

mkdirSync('proto-shots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Приветственный оверлей не нужен на скриншотах панели.
await page.addInitScript(() => localStorage.setItem('lh_welcome_seen', 'true'));

for (const shot of shots) {
    await page.goto(`http://127.0.0.1:4210/settlements?variant=${shot.variant}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    if (shot.click) {
        await page.click(shot.click);
        await page.waitForTimeout(300);
    }

    await page.screenshot({ path: `proto-shots/${shot.variant}.png` });
    console.log('shot', shot.variant);
}

await browser.close();
