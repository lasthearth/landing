/**
 * Собирает public/sitemap.xml: заранее собранные разделы, статьи вики, новости,
 * поселения и профили игроков, у которых есть что показать.
 *
 * Запускается перед сборкой (npm lifecycle «prebuild»): адреса динамических
 * страниц берутся из API, а сборке он недоступен. Если API не ответило, скрипт
 * оставляет прежний sitemap и предупреждает — старый файл лучше пустого,
 * и падение сборки из-за сети недопустимо.
 *
 * Заодно скрипт готовит список изменившихся адресов для IndexNow
 * (dist/indexnow-urls.json) — отправляет его отдельная команда `npm run indexnow`
 * уже после выкладки, когда новые страницы доступны.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_ROUTES_FILE = resolve(root, 'src/app/app.routes.server.ts');
const OUTPUT_FILE = resolve(root, 'public/sitemap.xml');
const RSS_FILE = resolve(root, 'public/rss.xml');
const LLMS_FILE = resolve(root, 'public/llms.txt');
const INDEXNOW_FILE = resolve(root, 'dist/indexnow-urls.json');
const SITE_URL = 'https://lasthearth.ru';
const API_URL = process.env.API_URL ?? 'https://api.lasthearth.ru/v1';

/**
 * Сколько записей просить за один запрос.
 */
const PAGE_SIZE = 50;

/**
 * Предохранитель постраничной загрузки — 40 страниц по 50 записей.
 */
const MAX_PAGES = 40;

/**
 * С какого числа часов профиль игрока попадает в sitemap.
 *
 * Профили новичков без статистики только засоряют индекс: показывать в них нечего.
 */
const PLAYER_MIN_HOURS = 10;

/**
 * Приоритет и частота обновления разделов.
 */
const STATIC_PAGES = {
    '/': { changefreq: 'daily', priority: '1.0' },
    '/rules': { changefreq: 'weekly', priority: '0.9' },
    '/about': { changefreq: 'monthly', priority: '0.8' },
    '/mods': { changefreq: 'weekly', priority: '0.7' },
    '/faq': { changefreq: 'weekly', priority: '0.9' },
    '/wiki': { changefreq: 'daily', priority: '0.9' },
    '/wiki/razdel/start': { changefreq: 'weekly', priority: '0.7' },
    '/wiki/razdel/settlements': { changefreq: 'weekly', priority: '0.7' },
    '/wiki/razdel/war': { changefreq: 'weekly', priority: '0.7' },
    '/wiki/razdel/economy': { changefreq: 'weekly', priority: '0.7' },
    '/wiki/razdel/world': { changefreq: 'weekly', priority: '0.7' },
    '/wiki/razdel/help': { changefreq: 'weekly', priority: '0.7' },
    '/market': { changefreq: 'daily', priority: '0.8' },
    '/settlements': { changefreq: 'daily', priority: '0.7' },
    '/players': { changefreq: 'daily', priority: '0.6' },
    '/start-game': { changefreq: 'monthly', priority: '0.8' },
    '/gallery': { changefreq: 'weekly', priority: '0.6' },
    '/videos': { changefreq: 'weekly', priority: '0.6' },
    '/diplomacy': { changefreq: 'daily', priority: '0.6' },
    '/news': { changefreq: 'daily', priority: '0.7' },
    '/events': { changefreq: 'weekly', priority: '0.6' },
    '/lfg': { changefreq: 'daily', priority: '0.5' },
    '/privacy-policy': { changefreq: 'yearly', priority: '0.3' },
    '/public-offer': { changefreq: 'yearly', priority: '0.3' },
};

/**
 * Экранирует значение для XML.
 *
 * @param {string} value Адрес или дата.
 * @returns {string} Значение, безопасное внутри тега.
 */
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
 * @param {string | number | undefined} value Дата в ISO или unix-время.
 * @param {string} fallback Значение, если даты нет.
 * @returns {string} Дата для lastmod.
 */
function lastmod(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const numeric = typeof value === 'number' || /^\d+$/.test(String(value)) ? Number(value) : NaN;
    const date = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(value);

    return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10);
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
 * Читает список адресов, которые собираются заранее.
 *
 * Режимы рендера задаёт файл серверных роутов (`src/app/app.routes.server.ts`),
 * поэтому отдельного routes.txt больше нет: список страниц живёт в одном месте.
 *
 * @returns {Promise<string[]>} Адреса вида `/wiki`.
 */
async function readPrerenderedRoutes() {
    const text = await readFile(SERVER_ROUTES_FILE, 'utf8');
    const block = text.match(/const PRERENDERED = \[([\s\S]*?)\];/);

    if (!block) {
        throw new Error('В app.routes.server.ts не найден список PRERENDERED');
    }

    const routes = [...block[1].matchAll(/'([^']+)'/g)].map((match) => `/${match[1]}`);

    // Разделы вики предсобираются по параметру (getPrerenderParams), поэтому
    // их адреса берём из того же списка, что и серверный роут.
    const sections = /const WIKI_SECTIONS = \[([^\]]*)\]/.exec(text);

    for (const match of sections?.[1].matchAll(/'([^']+)'/g) ?? []) {
        routes.push(`/wiki/razdel/${match[1]}`);
    }

    // Корень домена: в списке он записан пустой строкой.
    if (text.includes("path: '', renderMode: RenderMode.Prerender")) {
        routes.unshift('/');
    }

    return routes;
}

/**
 * Запрашивает JSON у API.
 *
 * @param {string} path Путь без базового адреса.
 * @returns {Promise<any>} Разобранный ответ.
 */
async function api(path) {
    const response = await fetch(`${API_URL}${path}`);

    if (!response.ok) {
        throw new Error(`API ${path} ответило ${response.status}`);
    }

    return response.json();
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

        const data = await api(`/wiki/articles?${query}`);
        const page_articles = Array.isArray(data.articles) ? data.articles : [];

        articles.push(...page_articles);
        pageToken = data.next_page_token ?? '';

        if (!pageToken) {
            break;
        }
    }

    return articles;
}

/**
 * Читает новости.
 *
 * @returns {Promise<Array<object>>} Новости.
 */
async function readNews() {
    const news = [];
    let pageToken = '';

    for (let page = 0; page < MAX_PAGES; page += 1) {
        const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });

        if (pageToken) {
            query.set('page_token', pageToken);
        }

        const data = await api(`/news?${query}`);
        const page_news = Array.isArray(data.news) ? data.news : [];

        news.push(...page_news);
        pageToken = data.next_page_token ?? '';

        if (!pageToken) {
            break;
        }
    }

    return news;
}

/**
 * Читает поселения.
 *
 * @returns {Promise<Array<{ id: string, updated_at?: string }>>} Поселения.
 */
async function readSettlements() {
    const data = await api('/settlements');

    return Array.isArray(data.settlements) ? data.settlements : [];
}

/**
 * Читает игроков из таблицы лидеров — тех, у кого есть часы в игре.
 *
 * @returns {Promise<Array<{ name: string, hours_played?: number|string, last_online?: string }>>} Игроки.
 */
async function readPlayers() {
    const data = await api('/leaderboard?filter=LEADERBOARD_FILTER_KILLS&limit=1000');
    const entries = Array.isArray(data.entries) ? data.entries : [];

    return entries.filter((entry) => Number(entry.hours_played ?? 0) >= PLAYER_MIN_HOURS && entry.name);
}

/**
 * Собирает RSS-ленту новостей: 20 последних.
 *
 * Ленту забирает Telegram-автопостинг и читалки; на сайте на неё ссылается
 * `<link rel="alternate">` в index.html.
 *
 * @param {Array<object>} news Новости из API (свежие сверху).
 * @returns {string} Документ RSS 2.0.
 */
function buildRss(news) {
    const items = news
        .filter((item) => item?.id)
        .slice(0, 20)
        .map((item) => {
            const date = item.created_at ?? item.published_at ?? item.updated_at;

            return [
                '        <item>',
                `            <title>${escapeXml(item.title ?? 'Новость')}</title>`,
                `            <link>${SITE_URL}/news/${item.id}</link>`,
                `            <guid isPermaLink="true">${SITE_URL}/news/${item.id}</guid>`,
                date ? `            <pubDate>${new Date(date).toUTCString()}</pubDate>` : '',
                `            <description>${escapeXml(item.preview ?? '')}</description>`,
                '        </item>',
            ]
                .filter(Boolean)
                .join('\n');
        })
        .join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '    <channel>',
        '        <title>Last Hearth — новости</title>',
        `        <link>${SITE_URL}/news</link>`,
        '        <description>Новости ролевого сервера Last Hearth</description>',
        '        <language>ru</language>',
        items,
        '    </channel>',
        '</rss>',
        '',
    ].join('\n');
}

/**
 * Собирает llms.txt — короткое описание сайта для ИИ-поисковиков
 * (формат llmstxt.org): основное плюс свежие статьи вики.
 *
 * @param {Array<{ slug: string, title?: string }>} articles Статьи вики.
 * @returns {string} Содержимое llms.txt.
 */
function buildLlms(articles) {
    const main = [
        ['О сервере', '/about', 'концепция, поселения, дипломатия, экономика'],
        ['Как начать', '/start-game', 'установка игры, подключение, проверка анкеты'],
        ['Правила', '/rules', 'правила сервера Last Hearth'],
        ['Вики', '/wiki', 'справочник по механикам игры'],
        ['FAQ', '/faq', 'частые вопросы'],
        ['Поселения', '/settlements', 'список поселений сервера'],
        ['Игроки', '/players', 'список игроков сервера'],
        ['Моды', '/mods', 'моды сервера с версиями'],
    ];
    const sections = [
        ['Начало игры', '/wiki/razdel/start'],
        ['Поселения', '/wiki/razdel/settlements'],
        ['Войны', '/wiki/razdel/war'],
        ['Экономика', '/wiki/razdel/economy'],
        ['Мир', '/wiki/razdel/world'],
        ['Помощь', '/wiki/razdel/help'],
    ];
    const lines = [
        '# Last Hearth',
        '',
        'Last Hearth — русскоязычный ролевой сервер Vintage Story: поселения от лагеря до провинции, дипломатия, войны по правилам, экономика, собственные моды, вики и события.',
        '',
        '## Основное',
        '',
        ...main.map(([name, path, note]) => `- [${name}](${SITE_URL}${path}): ${note}`),
        '',
        '## Вики',
        '',
        ...sections.map(([name, path]) => `- [Раздел «${name}»](${SITE_URL}${path})`),
        ...articles
            .filter((article) => article?.slug)
            .slice(0, 100)
            .map((article) => `- [${article.title ?? article.slug}](${SITE_URL}/wiki/${article.slug})`),
        '',
    ];

    return lines.join('\n');
}

/**
 * Читает прежний sitemap: по нему считается, что изменилось для IndexNow.
 *
 * @returns {Promise<Map<string, string>>} Адрес → lastmod.
 */
async function readPrevious() {
    if (!existsSync(OUTPUT_FILE)) {
        return new Map();
    }

    const text = await readFile(OUTPUT_FILE, 'utf8');
    const previous = new Map();

    for (const match of text.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
        previous.set(match[1], match[2]);
    }

    return previous;
}

/**
 * Записывает файл ключа IndexNow: робот проверяет его по адресу
 * `https://lasthearth.ru/<ключ>.txt`.
 *
 * @param {string} key Ключ из переменной окружения.
 */
async function writeIndexNowKey(key) {
    if (!/^[0-9a-f]{32,}$/i.test(key)) {
        console.warn('INDEXNOW_KEY должен быть не короче 32 hex-символов — ключ пропущен');

        return;
    }

    await writeFile(resolve(root, `public/${key}.txt`), key, 'utf8');
    console.log(`public/${key}.txt: файл ключа IndexNow записан`);
}

async function main() {
    const stamp = today();
    const previous = await readPrevious();
    const routes = await readPrerenderedRoutes();
    const entries = [];
    let articles = [];
    let news = [];
    let settlements = [];
    let players = [];

    try {
        [articles, news, settlements, players] = await Promise.all([
            readArticles(),
            readNews(),
            readSettlements(),
            readPlayers(),
        ]);
    } catch (error) {
        console.warn(`API недоступно (${error.message}): sitemap оставлен прежним`);

        return;
    }

    for (const route of routes) {
        const meta = STATIC_PAGES[route];

        if (!meta) {
            console.warn(`Для адреса ${route} нет priority/changefreq — добавьте его в STATIC_PAGES`);

            continue;
        }

        entries.push({ loc: `${SITE_URL}${route === '/' ? '/' : route}`, lastmod: stamp, ...meta });
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

    for (const item of news) {
        if (!item?.id) {
            continue;
        }

        entries.push({
            loc: `${SITE_URL}/news/${item.id}`,
            lastmod: lastmod(item.updated_at ?? item.created_at ?? item.published_at, stamp),
            changefreq: 'monthly',
            priority: '0.5',
        });
    }

    for (const settlement of settlements) {
        if (!settlement?.id) {
            continue;
        }

        entries.push({
            loc: `${SITE_URL}/settlements/${settlement.id}`,
            lastmod: lastmod(settlement.updated_at, stamp),
            changefreq: 'weekly',
            priority: '0.6',
        });
    }

    for (const player of players) {
        entries.push({
            loc: `${SITE_URL}/player/${encodeURIComponent(player.name)}`,
            lastmod: lastmod(player.last_online, stamp),
            changefreq: 'weekly',
            priority: '0.4',
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

    // IndexNow: отправляем только то, что появилось или изменилось с прошлой сборки.
    const changed = entries
        .filter((entry) => previous.get(entry.loc) !== entry.lastmod)
        .map((entry) => entry.loc)
        .slice(0, 10000);

    await writeFile(RSS_FILE, buildRss(news), 'utf8');
    await writeFile(LLMS_FILE, buildLlms(articles), 'utf8');

    await mkdir(dirname(INDEXNOW_FILE), { recursive: true });
    await writeFile(INDEXNOW_FILE, JSON.stringify(changed, null, 4), 'utf8');

    if (process.env.INDEXNOW_KEY) {
        await writeIndexNowKey(process.env.INDEXNOW_KEY);
    }

    console.log(
        `public/sitemap.xml: ${entries.length} адресов (${articles.length} статей, ${news.length} новостей, ${settlements.length} поселений, ${players.length} игроков), к отправке ${changed.length}`
    );
}

main().catch((error) => {
    console.error(`Не удалось собрать sitemap: ${error.message}`);
    process.exitCode = 1;
});
