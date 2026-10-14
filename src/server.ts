import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
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
 * Типы файлов, для которых при сборке образа лежит сжатая копия `<файл>.gz`
 * (scripts/precompress.mjs). Сжатие раньше делал nginx; без него 2 МБ JS
 * уходили бы в сеть целиком.
 */
const GZIP_TYPES: Record<string, string> = {
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
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
 * Сжатая копия статики, если браузер принимает gzip и копия есть.
 */
app.use((req, res, next) => {
    const type = GZIP_TYPES[extname(req.path).toLowerCase()];

    if ((req.method !== 'GET' && req.method !== 'HEAD') || !type || !/\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        next();

        return;
    }

    const file = resolve(browserDistFolder, `.${req.path}`);
    const gzipped = `${file}.gz`;

    if (!file.startsWith(browserDistFolder + sep) || !existsSync(gzipped)) {
        next();

        return;
    }

    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', type);
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader(
        'Cache-Control',
        /\.(?:m?js|css)$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
    );
    res.sendFile(gzipped);
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
 * Всё остальное — Angular: предрендеренные страницы отдаются из сборки,
 * динамические рисуются на сервере, неизвестные адреса получают 404 приложения.
 */
app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then(async (response) => {
            if (!response) {
                next();

                return;
            }

            const html = /text\/html/.test(response.headers.get('content-type') ?? '');
            const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');

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
