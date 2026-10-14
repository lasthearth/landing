import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Порт Node-сервера. Наружу смотрит nginx, поэтому порт внутренний.
 */
const PORT = Number(process.env['PORT'] ?? 4000);

/**
 * Каталог собранной статики (`browser/`) рядом с серверным бандлом.
 */
const browserDistFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Один вид адресов: `/home` → `/`, `/<путь>/` → `/<путь>`.
 *
 * Nginx делает то же самое снаружи; дублирование нужно, чтобы сервер вёл себя
 * так же, когда его запускают напрямую (локальная проверка, отладка).
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

    next();
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
        .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
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
