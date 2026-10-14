/**
 * Сообщает Яндексу (а через его индекс — Bing и поиску ИИ) об изменившихся адресах.
 *
 * Отправка идёт по протоколу IndexNow после выкладки: во время сборки новых
 * страниц на сайте ещё нет, поэтому список готовит gen-sitemap.mjs
 * (dist/indexnow-urls.json), а эта команда только отправляет его — npm run indexnow.
 * Ошибка отправки не должна ронять деплой: поисковик просто придёт за адресами
 * позже обычным обходом.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIST_FILE = resolve(root, 'dist/indexnow-urls.json');
const SITE_URL = 'https://lasthearth.ru';
// Адрес переопределяется переменной окружения: так протокол проверяют
// на подменённом адресе, не отправляя пробные адреса в индекс.
const ENDPOINT = process.env.INDEXNOW_ENDPOINT ?? 'https://yandex.com/indexnow';

/**
 * Отправляет список изменившихся адресов.
 */
async function main() {
    const key = process.env.INDEXNOW_KEY;

    if (!key) {
        console.warn('INDEXNOW_KEY не задан — отправка IndexNow пропущена');

        return;
    }

    if (!existsSync(LIST_FILE)) {
        console.warn('dist/indexnow-urls.json не найден: сначала соберите сайт (npm run build)');

        return;
    }

    const urls = JSON.parse(await readFile(LIST_FILE, 'utf8'));

    if (!Array.isArray(urls) || urls.length === 0) {
        console.log('IndexNow: изменившихся адресов нет');

        return;
    }

    const payload = {
        host: new URL(SITE_URL).host,
        key: key,
        keyLocation: SITE_URL + '/' + key + '.txt',
        urlList: urls.slice(0, 10000),
    };

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.warn('IndexNow ответил ' + response.status + ' — адреса не отправлены');

            return;
        }

        console.log('IndexNow: отправлено ' + payload.urlList.length + ' адресов');

        // Отправленное не повторяем: список обнуляем до следующей сборки.
        await writeFile(LIST_FILE, JSON.stringify([], null, 4), 'utf8');
    } catch (error) {
        console.warn('IndexNow недоступен (' + error.message + ') — адреса не отправлены');
    }
}

main().catch((error) => {
    console.error('Не удалось отправить IndexNow: ' + error.message);
    process.exitCode = 1;
});
