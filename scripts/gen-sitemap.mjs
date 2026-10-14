/**
 * Собирает public/sitemap.xml: статичные адреса из routes.txt и статьи вики.
 *
 * Запускается вручную перед сборкой релиза (`npm run sitemap`): сборке доступ
 * к API не нужен, поэтому в Dockerfile и `ng build` шага нет. Если API недоступно,
 * скрипт падает и файл не трогает — старый sitemap лучше пустого.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES_FILE = resolve(root, 'routes.txt');
const OUTPUT_FILE = resolve(root, 'public/sitemap.xml');
const SITE_URL = 'https://lasthearth.ru';
const WIKI_API_URL = process.env.WIKI_API_URL ?? 'https://api.lasthearth.ru/v1';

/**
 * Сколько статей просить за один запрос: больше сервер не отдаёт.
 */
const PAGE_SIZE = 50;

/**
 * Предохранитель постраничной загрузки — 40 страниц по 50 статей.
 */
const MAX_PAGES = 40;

/**
 * Приоритет и частота обновления статичных адресов.
 *
 * Значения перенесены из прежнего public/sitemap.xml.
 */
const STATIC_PAGES = {
    '/home': { changefreq: 'daily', priority: '1.0' },
    '/rules': { changefreq: 'weekly', priority: '0.9' },
    '/faq': { changefreq: 'weekly', priority: '0.9' },
    '/wiki': { changefreq: 'daily', priority: '0.9' },
    '/market': { changefreq: 'daily', priority: '0.8' },
    '/settlements': { changefreq: 'daily', priority: '0.7' },
    '/players': { changefreq: 'daily', priority: '0.6' },
    '/start-game': { changefreq: 'monthly', priority: '0.8' },
    '/privacy-policy': { changefreq: 'yearly', priority: '0.3' },
    '/public-offer': { changefreq: 'yearly', priority: '0.3' },
};

/**
 * Экранирует адрес для XML.
 *
 * @param {string} value Адрес или дата.
 * @returns {string} Значение, безопасное внутри тега.
 */
function escapeXml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Сегодняшняя дата в виде, который понимает sitemap.
 *
 * @returns {string} Дата `ГГГГ-ММ-ДД`.
 */
function today() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Приводит дату сервера к `ГГГГ-ММ-ДД`.
 *
 * @param {string | undefined} value Дата в ISO.
 * @param {string} fallback Значение, если даты нет.
 * @returns {string} Дата для lastmod.
 */
function lastmod(value, fallback) {
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : fallback;
}

/**
 * Собирает один блок <url>.
 *
 * @param {{ loc: string, lastmod: string, changefreq: string, priority: string }} entry Адрес и его параметры.
 * @returns {string} Блок sitemap.
 */
function urlEntry(entry) {
    return [
        '    <url>',
        `        <loc>${escapeXml(entry.loc)}</loc>`,
        `        <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
        `        <changefreq>${entry.changefreq}</changefreq>`,
        `        <priority>${entry.priority}</priority>`,
        '    </url>',
    ].join('\n');
}

/**
 * Читает статичные адреса из routes.txt.
 *
 * @returns {Promise<string[]>} Адреса без /404.
 */
async function readRoutes() {
    const text = await readFile(ROUTES_FILE, 'utf8');

    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('/') && line !== '/404');
}

/**
 * Читает все опубликованные статьи вики.
 *
 * @returns {Promise<Array<{ slug: string, updated_at?: string }>>} Статьи.
 */
async function readArticles() {
    const articles = [];
    let pageToken = '';

    for (let page = 0; page < MAX_PAGES; page += 1) {
        const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });

        if (pageToken) {
            query.set('page_token', pageToken);
        }

        const response = await fetch(`${WIKI_API_URL}/wiki/articles?${query}`);

        if (!response.ok) {
            throw new Error(`Wiki API ответило ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.articles)) {
            throw new Error('Wiki API вернуло не JSON со списком статей');
        }

        articles.push(...data.articles);
        pageToken = data.next_page_token ?? '';

        if (!pageToken) {
            break;
        }
    }

    return articles;
}

async function main() {
    const [routes, articles] = await Promise.all([readRoutes(), readArticles()]);
    const stamp = today();
    const entries = [];

    for (const route of routes) {
        const meta = STATIC_PAGES[route];

        if (!meta) {
            throw new Error(`Для адреса ${route} нет priority/changefreq — добавьте его в STATIC_PAGES`);
        }

        entries.push({ loc: `${SITE_URL}${route}`, lastmod: stamp, ...meta });
    }

    for (const article of articles) {
        if (!article?.slug) {
            continue;
        }

        entries.push({
            loc: `${SITE_URL}/wiki/${article.slug}`,
            lastmod: lastmod(article.updated_at, stamp),
            changefreq: 'weekly',
            priority: '0.7',
        });
    }

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.map(urlEntry),
        '</urlset>',
        '',
    ].join('\n');

    await writeFile(OUTPUT_FILE, xml, 'utf8');
    console.log(`public/sitemap.xml: ${entries.length} адресов (${articles.length} статей)`);
}

main().catch((error) => {
    console.error(`Не удалось собрать sitemap: ${error.message}`);
    process.exitCode = 1;
});
