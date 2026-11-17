import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import type { Request, Response as ExpressResponse } from 'express';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzip as gzipCallback } from 'node:zlib';

/**
 * Сжатие gzip в виде промиса.
 */
const gzip = promisify(gzipCallback);

/**
 * Порт Node-сервера. В контейнере — 8080 (задаёт Dockerfile): сервер один
 * отдаёт и статику, и страницы, отдельного nginx перед ним нет.
 */
const PORT = Number(process.env['PORT'] ?? 4000);

/**
 * Типы файлов, для которых при сборке образа лежат сжатые копии `<файл>.gz`
 * и `<файл>.br` (scripts/precompress.mjs). Сжатие раньше делал nginx; без него
 * 2 МБ JS уходили бы в сеть целиком. HTML — страницы предрендера.
 */
const PRECOMPRESSED_TYPES: Record<string, string> = {
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
};

/**
 * Каталог собранной статики (`browser/`) рядом с серверным бандлом.
 */
const browserDistFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Один вид адресов: `/home` → `/`, `/<путь>/` → `/<путь>`.
 *
 * Сервер в контейнере стоит без nginx, поэтому правила адресов живут здесь.
 */
app.use((req, res, next) => {
    const [path, query] = req.originalUrl.split('?');
    const suffix = query ? `?${query}` : '';

    if (path === '/home' || path === '/home/') {
        res.redirect(301, `/${suffix}`);

        return;
    }

    if (path.length > 1 && path.endsWith('/')) {
        res.redirect(301, `${path.replace(/\/+$/, '')}${suffix}`);

        return;
    }

    // Файлы предрендера (`/rules/index.html`) — дубли «чистых» адресов.
    if (path === '/index.html') {
        res.redirect(301, `/${suffix}`);

        return;
    }

    if (/\.html$/i.test(path)) {
        res.status(404).type('text/plain').send('Not found');

        return;
    }

    next();
});

/**
 * Сжатая копия статики или страницы предрендера, если браузер принимает brotli
 * или gzip и копия есть. Чистый адрес страницы (`/rules`) соответствует файлу
 * `/rules/index.html`: предрендер отдаётся с диска, без запуска Angular и без
 * сжатия на каждый запрос. Brotli предпочтительнее: копия плотнее gzip.
 */
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();

        return;
    }

    const extension = extname(req.path).toLowerCase();
    const type = PRECOMPRESSED_TYPES[extension];

    // Файл с расширением вне списка (картинки, шрифты) обслуживает express.static.
    if (extension && !type) {
        next();

        return;
    }

    const file = resolve(
        browserDistFolder,
        type ? `.${req.path}` : `.${req.path === '/' ? '' : req.path}/index.html`
    );

    if (!file.startsWith(browserDistFolder + sep)) {
        next();

        return;
    }

    const accepts = req.headers['accept-encoding'] ?? '';
    const encoding =
        /\bbr\b/.test(accepts) && existsSync(`${file}.br`)
            ? 'br'
            : /\bgzip\b/.test(accepts) && existsSync(`${file}.gz`)
              ? 'gzip'
              : null;

    if (!encoding) {
        next();

        return;
    }

    res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Type', type ?? 'text/html; charset=utf-8');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader(
        'Cache-Control',
        /\.(?:m?js|css)$/.test(file)
            ? 'public, max-age=31536000, immutable'
            : file.endsWith('.html')
              ? 'no-cache'
              : 'public, max-age=3600'
    );
    res.sendFile(`${file}.${encoding === 'br' ? 'br' : 'gz'}`);
});

/**
 * Статика сборки. Хешированные js/css можно кешировать навсегда, HTML — нельзя:
 * в нём ссылки на хешированные файлы, которые после деплоя исчезают.
 */
app.use(
    express.static(browserDistFolder, {
        index: false,
        redirect: false,
        setHeaders: (response, filePath) => {
            if (/\.(?:js|css)$/.test(filePath)) {
                response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

                return;
            }

            response.setHeader(
                'Cache-Control',
                filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=2592000'
            );
        },
    })
);

/**
 * Время жизни записи кэша гостевого HTML. Динамические страницы (вики, новости,
 * наделы, игроки, моды, карта) рендерятся по запросу и ходят в API; минута кэша
 * снимает лавину одинаковых рендеров при всплеске трафика (робот, репост).
 * Раньше это делал nginx (proxy_cache 60s), в одном контейнере кэша не было.
 */
const HTML_CACHE_TTL_MS = 60_000;

/** Предел записей в кэше: страницы по 100–400 КБ, память контейнера не резиновая. */
const HTML_CACHE_LIMIT = 200;

/** Куки сессии: запрос с ними идёт мимо кэша (аналог proxy_cache_bypass в nginx). */
const AUTH_COOKIE_PATTERN = /(?:^|;\s*)(?:authorization|access_token|id_token|refresh_token|token)=/i;

/**
 * Ответ Angular, прочитанный в память: одно тело раздаётся всем гостям по тому
 * же адресу, пока запись жива.
 */
interface BufferedPage {
    status: number;
    headers: [string, string][];
    raw: Uint8Array<ArrayBuffer>;
    gz: Uint8Array<ArrayBuffer> | null;
    cacheable: boolean;
    expires: number;
}

const pageCache = new Map<string, BufferedPage>();
const pageRenders = new Map<string, Promise<BufferedPage | null>>();

/**
 * Признак гостя: без заголовка Authorization и без кук сессии.
 *
 * @param req Запрос Express.
 * @returns true, если ответ можно положить в общий кэш.
 */
function isGuestRequest(req: Request): boolean {
    return !req.headers.authorization && !AUTH_COOKIE_PATTERN.test(req.headers.cookie ?? '');
}

/**
 * Отдаёт буферизованную страницу: gzip-копию, если браузер принимает gzip.
 *
 * @param page Запись кэша.
 * @param res Ответ Express.
 * @param acceptsGzip Принимает ли браузер gzip.
 * @returns Promise, разрешающийся после записи ответа.
 */
async function writeBufferedPage(page: BufferedPage, res: ExpressResponse, acceptsGzip: boolean): Promise<void> {
    const headers = new Headers(page.headers);
    let body = page.raw;

    if (page.gz && acceptsGzip) {
        headers.set('content-encoding', 'gzip');
        headers.set('vary', 'Accept-Encoding');
        body = page.gz;
    }

    headers.delete('content-length');

    await writeResponseToNodeResponse(new Response(body, { status: page.status, headers }), res);
}

/**
 * Потоковая отдача ответа Angular без кэша: для запросов с авторизацией и не-GET.
 *
 * @param response Ответ Angular.
 * @param res Ответ Express.
 * @param acceptsGzip Принимает ли браузер gzip.
 * @returns Promise, разрешающийся после записи ответа.
 */
async function writeAngularResponse(response: Response, res: ExpressResponse, acceptsGzip: boolean): Promise<void> {
    const html = /text\/html/.test(response.headers.get('content-type') ?? '');

    if (!html || !acceptsGzip || !response.body || response.headers.has('content-encoding')) {
        await writeResponseToNodeResponse(response, res);

        return;
    }

    // HTML страниц — 100–400 КБ, сжатый — в 5–6 раз меньше. Раньше это делал nginx.
    const body = await gzip(Buffer.from(await response.arrayBuffer()), { level: 6 });
    const headers = new Headers(response.headers);
    headers.set('content-encoding', 'gzip');
    headers.set('vary', 'Accept-Encoding');
    headers.delete('content-length');

    await writeResponseToNodeResponse(
        new Response(new Uint8Array(body), { status: response.status, statusText: response.statusText, headers }),
        res
    );
}

/**
 * Рендерит страницу и читает её в память вместе с gzip-копией.
 *
 * @param req Запрос Express.
 * @returns Запись для кэша или null, если Angular не ответил.
 */
async function renderBufferedPage(req: Request): Promise<BufferedPage | null> {
    const response = await angularApp.handle(req);

    if (!response) {
        return null;
    }

    const html = /text\/html/.test(response.headers.get('content-type') ?? '');
    const raw = response.body ? new Uint8Array(await response.arrayBuffer()) : new Uint8Array();
    const gz =
        html && raw.length > 0 && !response.headers.has('content-encoding')
            ? new Uint8Array(await gzip(Buffer.from(raw), { level: 6 }))
            : null;

    return {
        status: response.status,
        headers: [...response.headers.entries()].filter(([name]) => name !== 'content-length'),
        raw,
        gz,
        cacheable:
            response.status === 200 && html && !response.headers.has('set-cookie') && !response.headers.has('content-encoding'),
        expires: Date.now() + HTML_CACHE_TTL_MS,
    };
}

/**
 * Всё остальное — Angular: предрендеренные страницы отдаются из сборки,
 * динамические рисуются на сервере, неизвестные адреса получают 404 приложения.
 * Гостевые GET-ответы на минуту ложатся в память; одновременные запросы одного
 * адреса ждут один рендер, а не запускают свой.
 */
app.use((req, res, next) => {
    const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
    const key = req.method === 'GET' && isGuestRequest(req) ? req.originalUrl : null;

    if (!key) {
        angularApp
            .handle(req)
            .then(async (response) => {
                if (!response) {
                    next();

                    return;
                }

                await writeAngularResponse(response, res, acceptsGzip);
            })
            .catch(next);

        return;
    }

    const cached = pageCache.get(key);

    if (cached && cached.expires > Date.now()) {
        res.setHeader('X-Cache-Status', 'HIT');
        writeBufferedPage(cached, res, acceptsGzip).catch(next);

        return;
    }

    let pending = pageRenders.get(key);

    if (!pending) {
        pending = renderBufferedPage(req);
        pageRenders.set(key, pending);
        pending.finally(() => pageRenders.delete(key)).catch(() => undefined);
    }

    pending
        .then(async (page) => {
            if (!page) {
                next();

                return;
            }

            if (page.cacheable) {
                if (pageCache.size >= HTML_CACHE_LIMIT) {
                    const oldest = pageCache.keys().next().value;

                    if (oldest !== undefined) {
                        pageCache.delete(oldest);
                    }
                }

                pageCache.set(key, page);
            }

            res.setHeader('X-Cache-Status', 'MISS');
            await writeBufferedPage(page, res, acceptsGzip);
        })
        .catch(next);
});

if (isMainModule(import.meta.url)) {
    app.listen(PORT, () => console.log(`Node Express server listening on http://localhost:${PORT}`));
}

/**
 * Обработчик запросов для `ng serve` и сборки: dev-сервер Angular ищет
 * именно именованный экспорт `reqHandler`. Без него он брал встроенный SSR,
 * правила выше не работали, и переход /home?code=… → / терял параметры
 * OIDC-колбэка — вход завершался ничем.
 */
export const reqHandler = createNodeRequestHandler(app);
