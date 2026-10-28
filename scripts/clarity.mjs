/**
 * Клиент Microsoft Clarity: данные дашборда, выборка записей сессий, документация.
 *
 * Зачем: агент и разработчик читают Clarity без браузера и без входа в дашборд.
 * Работает через те же эндпоинты, что и официальный MCP-сервер
 * `@microsoft/clarity-mcp-server` (https://github.com/microsoft/clarity-mcp-server):
 * POST https://clarity.microsoft.com/mcp/{dashboard/query|recordings/sample|documentation/query}
 * с заголовком `Authorization: Bearer <токен>`.
 *
 * Токен: Clarity → проект → Settings → Data Export → Generate new API token (только админ проекта).
 * Порядок поиска токена: `--token`, переменная окружения `CLARITY_API_TOKEN`,
 * файл `CLARITY_ENV_FILE`, `%USERPROFILE%\.dsh\clarity\.env`, `.env` в корне репозитория.
 * В репозиторий токен не коммитим: `.env` закрыт в `.gitignore`, файл в `.dsh` — вне репозитория.
 *
 * Лимиты Clarity: 10 запросов на проект в сутки, окно данных 1–3 дня,
 * в выборке записей не более 250 сессий. Ответ приходит в UTC.
 *
 * Запуск:
 *   node scripts/clarity.mjs check
 *   node scripts/clarity.mjs dashboard "трафик по устройствам за 3 дня"
 *   node scripts/clarity.mjs recordings --days 2 --count 20 --rage
 *   node scripts/clarity.mjs docs "как настроить custom tags"
 *   node scripts/clarity.mjs raw recordings '{"start":"...","end":"...","filters":{},"count":5}'
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** База MCP-эндпоинтов Clarity. */
const API_BASE = 'https://clarity.microsoft.com/mcp';

/** Пути эндпоинтов: дашборд, выборка записей, документация. */
const ENDPOINTS = {
    dashboard: `${API_BASE}/dashboard/query`,
    recordings: `${API_BASE}/recordings/sample`,
    documentation: `${API_BASE}/documentation/query`,
};

/** Числовые коды сортировки, которые принимает эндпоинт записей. */
const SORT_CODES = {
    SessionStart_DESC: 0,
    SessionStart_ASC: 1,
    SessionDuration_ASC: 2,
    SessionDuration_DESC: 3,
    SessionClickCount_ASC: 4,
    SessionClickCount_DESC: 5,
    PageCount_ASC: 6,
    PageCount_DESC: 7,
};

/** Файлы, из которых берём токен, если его нет в окружении. */
const ENV_FILES = [
    process.env['CLARITY_ENV_FILE'],
    process.env['USERPROFILE'] ? join(process.env['USERPROFILE'], '.dsh', 'clarity', '.env') : null,
    join(resolve('.'), '.env'),
].filter(Boolean);

/**
 * Разбирает аргументы командной строки на флаги и позиционные значения.
 *
 * @param {string[]} argv Аргументы без `node` и пути к скрипту.
 * @returns {{ flags: Record<string, string | boolean>, args: string[] }} Флаги и positional-аргументы.
 */
function parseArgv(argv) {
    const flags = {};
    const args = [];

    for (let i = 0; i < argv.length; i += 1) {
        const item = argv[i];

        if (!item.startsWith('--')) {
            args.push(item);
            continue;
        }

        const name = item.slice(2);
        const eq = name.indexOf('=');

        if (eq !== -1) {
            flags[name.slice(0, eq)] = name.slice(eq + 1);
            continue;
        }

        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--')) {
            flags[name] = true;
        } else {
            flags[name] = next;
            i += 1;
        }
    }

    return { flags, args };
}

/**
 * Читает переменную из dotenv-файла (строки `KEY=value`, комментарии и кавычки поддерживаются).
 *
 * @param {string} file Путь к файлу.
 * @param {string} key Имя переменной.
 * @returns {string | undefined} Значение или undefined, если файла или ключа нет.
 */
function readEnvFile(file, key) {
    if (!existsSync(file)) {
        return undefined;
    }

    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const eq = trimmed.indexOf('=');

        if (eq === -1) {
            continue;
        }

        if (trimmed.slice(0, eq).trim() !== key) {
            continue;
        }

        return trimmed
            .slice(eq + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
    }

    return undefined;
}

/**
 * Ищет токен Clarity по всем источникам.
 *
 * @param {Record<string, string | boolean>} flags Флаги командной строки.
 * @returns {{ token?: string, source: string }} Токен и откуда он взят.
 */
function resolveToken(flags) {
    if (typeof flags['token'] === 'string' && flags['token']) {
        return { token: flags['token'], source: '--token' };
    }

    const fromEnv = process.env['CLARITY_API_TOKEN'] ?? process.env['clarity_api_token'];

    if (fromEnv) {
        return { token: fromEnv, source: 'CLARITY_API_TOKEN' };
    }

    for (const file of ENV_FILES) {
        const value = readEnvFile(file, 'CLARITY_API_TOKEN');

        if (value) {
            return { token: value, source: file };
        }
    }

    return { source: 'не найден' };
}

/**
 * Пояснение по коду ответа Clarity.
 *
 * @param {number} status Код HTTP-ответа.
 * @returns {string} Текст подсказки на русском.
 */
function hintFor(status) {
    if (status === 401) {
        return 'Токен отсутствует, неверен или истёк: перевыпустите его в Settings → Data Export.';
    }

    if (status === 403) {
        return 'Токен не имеет права на эту операцию: нужен токен администратора проекта.';
    }

    if (status === 400) {
        return 'Параметры запроса отвергнуты: проверьте диапазон дат, фильтры и count (не более 250).';
    }

    if (status === 429) {
        return 'Превышен дневной лимит Clarity: 10 запросов на проект в сутки.';
    }

    return 'Запрос не прошёл.';
}

/**
 * Выполняет POST-запрос к Clarity.
 *
 * @param {string} url Полный адрес эндпоинта.
 * @param {unknown} body Тело запроса.
 * @param {string} token Токен доступа.
 * @returns {Promise<unknown>} Разобранный JSON ответа.
 */
async function post(url, body, token) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
        process.stderr.write(
            `Clarity ответила ${response.status} на ${url}\n${hintFor(response.status)}\n${text.slice(0, 800)}\n`
        );
        process.exit(1);
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Собирает тело запроса выборок записей из флагов командной строки.
 *
 * @param {Record<string, string | boolean>} flags Флаги командной строки.
 * @returns {object} Тело запроса для `recordings/sample`.
 */
function buildRecordingsBody(flags) {
    const days = Math.max(1, Number(flags['days'] ?? 2));
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const sort = String(flags['sort'] ?? 'SessionStart_DESC');

    if (!(sort in SORT_CODES)) {
        process.stderr.write(`Неизвестная сортировка ${sort}. Доступны: ${Object.keys(SORT_CODES).join(', ')}\n`);
        process.exit(1);
    }

    /** @type {Record<string, unknown>} */
    const filters = { date: { start: start.toISOString(), end: end.toISOString() } };

    const list = (name) =>
        typeof flags[name] === 'string'
            ? String(flags[name])
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;
    const range = (name, min) => {
        if (typeof flags[name] !== 'string') {
            return undefined;
        }

        const [rawMin, rawMax] = String(flags[name]).split(',');

        return {
            min: rawMin === '' ? null : (Number(rawMin) ?? min),
            max: rawMax === undefined || rawMax === '' ? null : Number(rawMax),
        };
    };

    const urlFilter = (name) => {
        const value = list(name);

        return value ? value.map((url) => ({ url, operator: 'contains' })) : undefined;
    };

    const bool = (name) => (flags[name] === true || flags[name] === 'true' ? true : undefined);

    Object.assign(filters, {
        visitedUrls: urlFilter('url'),
        entryUrls: urlFilter('entry-url'),
        exitUrls: urlFilter('exit-url'),
        deviceType: list('device'),
        os: list('os'),
        browser: list('browser'),
        country: list('country'),
        city: list('city'),
        source: list('source'),
        channel: list('channel'),
        smartEvents: list('smart-event'),
        javascriptErrors: flags['js-error'] === true ? [''] : list('js-error'),
        clickErrors: flags['click-error'] === true ? [''] : list('click-error'),
        clickedText: typeof flags['clicked-text'] === 'string' ? String(flags['clicked-text']) : undefined,
        rageClickPresent: bool('rage'),
        deadClickPresent: bool('dead'),
        quickbackClickPresent: bool('quickback'),
        excessiveScrollPresent: bool('excessive-scroll'),
        sessionDuration: range('min-duration'),
        scrollDepth: range('scroll'),
        sessionClickEventCount: range('clicks'),
        pagesCount: range('pages'),
    });

    for (const key of Object.keys(filters)) {
        if (filters[key] === undefined) {
            delete filters[key];
        }
    }

    const count = Math.min(250, Math.max(1, Number(flags['count'] ?? 20)));

    return { sortBy: SORT_CODES[sort], start: filters['date'].start, end: filters['date'].end, filters, count };
}

/**
 * Печатает ответ: полный JSON или краткую строку на элемент.
 *
 * @param {unknown} data Ответ Clarity.
 * @param {Record<string, string | boolean>} flags Флаги командной строки.
 * @returns {void}
 */
function printResult(data, flags) {
    const json = JSON.stringify(data, null, 2);

    if (typeof flags['out'] === 'string') {
        writeFileSync(String(flags['out']), json, 'utf8');
        process.stdout.write(`Записано: ${flags['out']}\n`);

        return;
    }

    if (flags['json'] === true) {
        process.stdout.write(`${json}\n`);

        return;
    }

    const rows = extractRows(data);

    if (!rows) {
        process.stdout.write(`${json}\n`);

        return;
    }

    process.stdout.write(`Найдено записей: ${rows.length}\n`);

    for (const row of rows) {
        process.stdout.write(`${summarize(row)}\n`);
    }
}

/**
 * Достаёт массив объектов из ответа произвольной формы.
 *
 * @param {unknown} data Ответ Clarity.
 * @returns {object[] | undefined} Массив строк или undefined.
 */
function extractRows(data) {
    if (Array.isArray(data)) {
        return data.filter((item) => item && typeof item === 'object');
    }

    if (data && typeof data === 'object') {
        for (const value of Object.values(data)) {
            const rows = extractRows(value);

            if (rows && rows.length > 0) {
                return rows;
            }
        }
    }

    return undefined;
}

/** Поля, которые стоит показать в краткой строке записи сессии. */
const SUMMARY_KEYS = [
    'sessionId',
    'id',
    'startTime',
    'sessionStart',
    'duration',
    'sessionDuration',
    'url',
    'pageUrl',
    'landingUrl',
    'deviceType',
    'os',
    'browser',
    'country',
    'city',
    'clickCount',
    'sessionClickCount',
    'pageCount',
    'recordingUrl',
    'link',
];

/**
 * Собирает одну строку из объекта: сначала известные поля, затем остальные скаляры.
 *
 * @param {object} row Объект из ответа.
 * @returns {string} Строка вида `key=value key=value`.
 */
function summarize(row) {
    const parts = [];

    for (const key of SUMMARY_KEYS) {
        if (row[key] !== undefined && row[key] !== null && typeof row[key] !== 'object') {
            parts.push(`${key}=${row[key]}`);
        }
    }

    if (parts.length === 0) {
        for (const [key, value] of Object.entries(row)) {
            if (typeof value !== 'object' && parts.length < 8) {
                parts.push(`${key}=${value}`);
            }
        }
    }

    return parts.join(' ');
}

/**
 * Печатает справку и завершает работу.
 *
 * @returns {never}
 */
function printHelp() {
    process.stdout.write(
        [
            'Clarity-клиент: node scripts/clarity.mjs <команда> [параметры]',
            '',
            '  check                                   показать, где найден токен',
            '  dashboard "<запрос на русском>"         метрики дашборда (естественный язык)',
            '  recordings [параметры]                  выборка записей сессий',
            '  docs "<вопрос>"                         поиск по документации Clarity',
            "  raw <dashboard|recordings|documentation> '<json>'   прямой запрос",
            '',
            'Параметры recordings:',
            '  --days 2            окно назад в днях (данные Clarity доступны за 1–3 дня)',
            '  --count 20          число сессий, не более 250',
            '  --sort SessionStart_DESC   см. SORT_CODES в этом файле',
            '  --url /market --entry-url / --exit-url /',
            '  --device Mobile,PC --os Windows --browser Chrome --country Russia --city Moscow',
            '  --js-error --click-error --rage --dead --quickback --excessive-scroll',
            '  --smart-event SignUp --clicked-text "Купить" --min-duration 2 --scroll 50,100',
            '  --json              полный ответ вместо кратких строк',
            '  --out <файл>        записать ответ в файл',
            '',
            'Общие: --token <токен> --out <файл>',
            'Лимит: 10 запросов на проект в сутки.',
            '',
        ].join('\n')
    );

    process.exit(1);
}

/**
 * Точка входа: разбирает команду и выполняет запрос.
 *
 * @returns {Promise<void>}
 */
async function main() {
    const { flags, args } = parseArgv(process.argv.slice(2));
    const command = args[0];

    if (!command || command === 'help' || flags['help'] === true) {
        printHelp();
    }

    const { token, source } = resolveToken(flags);

    if (command === 'check') {
        process.stdout.write(
            `Токен: ${token ? `найден (${source}), длина ${token.length}` : `не найден (${source})`}\n`
        );
        process.stdout.write(`Файлы поиска: ${ENV_FILES.join(', ')}\n`);
        process.stdout.write(`Эндпоинты: ${Object.values(ENDPOINTS).join(', ')}\n`);

        if (!token) {
            process.stdout.write('Положите токен в %USERPROFILE%\\.dsh\\clarity\\.env строкой CLARITY_API_TOKEN=...\n');
            process.exit(1);
        }

        return;
    }

    if (!token) {
        process.stderr.write(
            `Токен Clarity не найден (${source}).\nСоздайте его: Clarity → проект → Settings → Data Export → Generate new API token.\nПоложите в %USERPROFILE%\\.dsh\\clarity\\.env строкой CLARITY_API_TOKEN=...\n`
        );
        process.exit(1);
    }

    if (command === 'dashboard') {
        const query = args[1];

        if (!query) {
            process.stderr.write('Нужен текст запроса: dashboard "трафик по устройствам за 3 дня"\n');
            process.exit(1);
        }

        printResult(
            await post(ENDPOINTS.dashboard, { query, timezone: String(flags['tz'] ?? 'Europe/Moscow') }, token),
            flags
        );

        return;
    }

    if (command === 'docs') {
        const query = args[1];

        if (!query) {
            process.stderr.write('Нужен текст вопроса: docs "как настроить custom tags"\n');
            process.exit(1);
        }

        printResult(await post(ENDPOINTS.documentation, { query }, token), flags);

        return;
    }

    if (command === 'recordings') {
        printResult(await post(ENDPOINTS.recordings, buildRecordingsBody(flags), token), flags);

        return;
    }

    if (command === 'raw') {
        const target = args[1];
        const body = args[2];

        if (!ENDPOINTS[target] || !body) {
            process.stderr.write("Формат: raw <dashboard|recordings|documentation> '<json>'\n");
            process.exit(1);
        }

        printResult(await post(ENDPOINTS[target], JSON.parse(body), token), flags);

        return;
    }

    process.stderr.write(`Неизвестная команда: ${command}\n`);
    printHelp();
}

await main();
