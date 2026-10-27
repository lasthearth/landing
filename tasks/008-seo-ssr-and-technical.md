# 008 — SEO: настоящий HTML для поисковиков, коды ответа, канонические адреса

Цель: поисковик (в первую очередь Яндекс — он почти не исполняет JS) получает на каждой публичной странице готовый HTML с текстом, своим title, description, canonical и правильным кодом ответа.

Сейчас:
- **Динамические страницы пустые для робота.** `/wiki/<статья>`, `/news/<id>`, `/settlements/<id>`, `/player/<ник>` не пререндерятся; nginx отдаёт на них `index.csr.html`, пустую оболочку. SEO-теги эти страницы ставят только в браузере. Для Яндекса статей вики, новостей и поселений по сути нет — а это самый ценный для поиска контент сайта.
- **Нет 404.** `try_files $uri $uri/index.html /index.csr.html` отвечает 200 на любой адрес, включая несуществующие: поисковики видят «мягкие 404» и тратят на них обход.
- **Главная — `/home`.** `/` отвечает 301 на `/home`. Сильнее всего ранжируется корень домена; в выдаче и при ссылках на сайт он должен быть каноническим.
- Не пререндерятся `/gallery`, `/videos`, `/diplomacy`, `/events`, `/lfg`.

Ветка: agent/008 от main.

Обязательно прочитать: AGENTS.md, docs/TRAPS.md, `docs/archive/seo-retention-fixes.md` — разделы 3 (nginx), 4.4 (robots), 5 (SeoService), 6 (index.html), 8.2 (гидратация). В нём есть проверенный код; часть уже сделана (ссылки в шапке, гидратация, `setJsonLd`), часть устарела — сверять с текущим кодом, а не копировать.

Пути — от `src/app/`, если не указано иное.

## A. Серверный рендеринг (Angular SSR) вместо статики для динамических страниц
Пререндер при сборке не подходит: статьи, новости, поселения и игроки появляются каждый день, а сборка не может ходить в API при каждом изменении. Нужен рендер на сервере по запросу.

1. Перевести сборку на `outputMode: "server"` (`angular.json` → `build.options`: `"outputMode": "server"`, `"ssr": { "entry": "src/server.ts" }`; `prerender`/`routesFile` убрать — режимы задаёт файл серверных роутов). Создать `src/server.ts` по шаблону Angular 20 (`AngularNodeAppEngine` + express; `npm i express` и `@types/express`, если их нет). Порт из `process.env.PORT`, по умолчанию 4000.
2. `src/app/app.routes.server.ts` (`ServerRoute[]`), подключить в `app.config.server.ts` через `provideServerRendering(withRoutes(serverRoutes))`:
   - `RenderMode.Prerender`: `''` (главная), `rules`, `faq`, `start-game`, `market`, `privacy-policy`, `public-offer`, `wiki`, `settlements`, `gallery`, `videos`, `diplomacy`, `events`, `lfg`, `players` (если страница из задачи 007 уже есть);
   - `RenderMode.Server`: `wiki/:slug`, `news/:id`, `settlements/:id`, `player/:nick`;
   - `RenderMode.Client`: `profile/**`, `wiki/edit/**`, `join/**`, всё под авторизацией;
   - `**` — `RenderMode.Server` (чтобы неизвестный адрес получил 404 от приложения, см. п. 6).
3. **Данные на сервере.** Сейчас эти страницы грузят данные только в браузере (`isPlatformBrowser`/`afterNextRender` в `news-page`, `settlement-page`, `player-page`, `wiki-article-page`, `wiki-list-page`, `WikiStoreService.load`). Для перечисленных в п. 2 страниц загрузка **основного контента** должна идти и на сервере; в браузере оставить только то, что зависит от `window`, таймеров, `localStorage` и авторизации. Повторного запроса после гидратации не будет: `provideClientHydration()` уже включает кэш HTTP-ответов (проверить, что `withHttpTransferCacheOptions` не исключает эти запросы; исключить нужно только `/serverinfo/` и `/discord/` — онлайн и чат должны быть свежими).
   - Счётчик просмотров новости — `POST /news/{id}/views`, `GET` его не увеличивает: робот и SSR просмотры не накручивают. Отправлять `POST` только в браузере.
   - Чего на сервере быть не должно: запросов с токеном пользователя (SSR рендерит гостевую версию), запросов к `/serverinfo/` и `/discord/`.
4. **Таймаут и ошибки API на сервере.** Если API не ответило за 3 с, рендер не должен висеть: страница отдаётся со скелетоном и кодом 200, данные догружаются в браузере. Реализовать через `HttpInterceptor` только на сервере (в `app.config.server.ts`): `timeout(3000)` + при ошибке — пустой результат, как сейчас делает `errorInterceptor` для GET.
5. **Гидратация.** После переезда пройти все страницы из п. 2 с открытой консолью: ошибок `NG05xx` быть не должно. Компоненты, которые рендерятся по-разному на сервере и в браузере (блок пользователя в шапке, карусель, частицы фона, виджет чата), — атрибут `ngSkipHydration` в месте использования, как описано в `docs/archive/seo-retention-fixes.md` 8.2.
6. **Коды ответа.** Через `inject(RESPONSE_INIT, { optional: true })` (Angular 20, `@angular/core`) на сервере:
   - `not-found` у статьи, новости, поселения, игрока → `status: 404`;
   - роут `**` (страница 404) → `status: 404`;
   - черновик статьи вики гостю → 404 (сервер его и не отдаст).
   Плюс `robots: noindex` в этих состояниях — как сейчас.

## B. Деплой
7. `Dockerfile`: сборка — `npm ci` + `npm run build` (без глобального `@angular/cli@17`); финальный образ — `node:22-alpine`, запускает `node dist/last-hearth-landing/server/server.mjs`, `ENV PORT=4000`, `NODE_ENV=production`. Статику (`browser/`) отдаёт nginx: он остаётся снаружи и проксирует на node только HTML.
8. `nginx.conf` (в том же образе или отдельным контейнером в `compose.yaml` — как проще в текущем деплое; решение описать в отчёте):
   - `absolute_redirect off; port_in_redirect off;` (уже есть первое);
   - `/home` и `/home/` → 301 на `/` с сохранением query (`?code=…&state=…` OIDC-колбэка);
   - `/<путь>/` → 301 на `/<путь>` (один вид адресов);
   - хешированные `*.js|*.css` и статика — из `browser/`, как сейчас, с кэшем;
   - всё остальное — `proxy_pass` на node с `proxy_set_header Host`, `X-Forwarded-Proto`, `X-Forwarded-For`; `proxy_intercept_errors off` (404 отдаёт приложение);
   - кэш HTML на 60 с для гостевых запросов (`proxy_cache` по URL, без кук авторизации; `/profile` не кэшировать) — чтобы всплеск трафика не клал node.
9. **Главная на `/`.** Роутер: `path: 'home'` → `redirectTo: ''`; страница главной — на `''`. `seo-data.ts`: `home.url = siteUrl + '/'`, `defaultSeo` в `app.component.ts` — так же. `redirectUri` / `postLogoutRedirectUri` в обоих `environment*.ts` → `https://lasthearth.ru/`; в отчёте написать, что в Logto нужно добавить `https://lasthearth.ru/` в Redirect URIs и Post sign-out URIs (старый `/home` оставить на 2 недели). Заменить `'/home'` на `'/'` в шаблонах, гвардах и `redirectTo` (найти поиском). Комментарий в роутах про «канонический адрес главной — /home» исправить.

## C. Теги, robots, sitemap
10. `core/services/seo.service.ts`:
    - `robots` выставлять **всегда**: по умолчанию `index, follow, max-image-preview:large` (сейчас после noindex-страницы тег остаётся до перезагрузки);
    - `keywords` не ставить и удалять (поисковики не учитывают);
    - canonical — только если задан `url`, иначе удалять (у 404 его быть не должно);
    - `og:image` — всегда, по умолчанию `https://lasthearth.ru/og-image.jpg`.
    Поле `keywords` из `ISeoData` и всех `seo-data.ts` убрать.
11. `src/index.html`:
    - убрать `translate="no"` с `<html>` и `meta keywords`;
    - добавить `<meta name="yandex-verification" content="ЗАМЕНИТЬ">` и `<meta name="google-site-verification" content="ЗАМЕНИТЬ">` (значения даст владелец, см. задачу 010; пока — закомментированными);
    - `favicon.ico` (16/32/48) в корне `public/`, `site.webmanifest`, иконки 192/512 — скрипт и разметка в `docs/archive/seo-retention-fixes.md` 6.1–6.3;
    - Clarity грузить только после согласия на cookies — это задача 009 п. 9, здесь не трогать.
12. Шрифты с Google Fonts — перенести на свою раздачу (`@fontsource`), как в `docs/archive/seo-retention-fixes.md` 6.4: Google Fonts из России открывается нестабильно, а это блокирующий CSS на каждой странице. После переноса визуально проверить формы и диалоги Taiga.
13. `public/robots.txt`:
    ```
    User-agent: *
    Disallow: /profile
    Disallow: /wiki/edit
    Disallow: /join/
    Disallow: /*?ref=

    User-agent: Yandex
    Disallow: /profile
    Disallow: /wiki/edit
    Disallow: /join/
    Clean-param: ref /
    Clean-param: q&section&tag&sort&seen&page /wiki
    Clean-param: q&seen&sort&page /players

    Sitemap: https://lasthearth.ru/sitemap.xml
    ```
    (фильтры вики и списка игроков — параметры адреса, а не новые страницы; `Clean-param` склеивает их для Яндекса, для Google — canonical без параметров).
14. `scripts/gen-sitemap.mjs`: добавить все пререндеренные разделы из п. 2, а из **существующего** публичного API (бэкенд в этой задаче не меняется) — опубликованные статьи вики (уже есть), новости (`GET /news` с пагинацией), поселения (`GET /settlements`) и игроков из таблицы лидеров (`GET /leaderboard`, тот же запрос, что `UserService.getAllPlayersStats$`) — только тех, у кого не меньше 10 часов в игре, чтобы не засорять индекс пустыми профилями. `lastmod` — дата изменения сущности, где API её отдаёт (у игроков — `last_online`). Главная — `https://lasthearth.ru/`. Генерация — в `prebuild` (сейчас скрипт запускается руками); если API недоступно, сборка не падает, а `sitemap.xml` остаётся прежним (как сейчас), с предупреждением в лог.
15. Подвал (`layout/footer/`) — блок ссылок на все публичные разделы, включая те, что в шапке спрятаны в выпадающее меню «Сообщество» (выпадающее меню рендерится только по клику, робот его ссылок не видит): Как начать, Правила, Вики, FAQ, Поселения, Игроки, Дипломатия, События, Поиск компании, Галерея, Видео, Магазин. Тексты — в `footer.i18n.ts` руками (см. TRAPS про `i18n -- set`).

16. **IndexNow из скрипта sitemap** (без бэкенда). Протокол сообщает Яндексу (а через него Bing — его индекс используют поиск ChatGPT и Copilot) об изменившихся страницах, и робот приходит за часы, а не за дни; Google протокол не поддерживает. В `gen-sitemap.mjs` после записи нового `sitemap.xml`:
    - сравнить с прежним (до перезаписи) по `loc` + `lastmod`; изменившиеся и новые адреса — список на отправку (не больше 10 000 за раз);
    - если задана переменная окружения `INDEXNOW_KEY` (32+ hex-символов): записать `browser`-файл ключа — `public/<ключ>.txt` с ключом внутри (в `.gitignore`), и после **успешного деплоя** отправить `POST https://yandex.com/indexnow` с `{"host":"lasthearth.ru","key":…,"keyLocation":"https://lasthearth.ru/<ключ>.txt","urlList":[…]}`. Отправку вынести в отдельную команду `npm run indexnow` (читает сохранённый список из `dist/indexnow-urls.json`), потому что во время сборки новых страниц на сайте ещё нет; в отчёте написать, куда в деплой вставить эту команду;
    - ключ не задан или API Яндекса ответило ошибкой — предупреждение в лог, сборка и деплой не падают.

## Проверка исполнителем
- `npm run verify`, `npm test`, `npm run build` — 0 ошибок; `docker build` проходит.
- Локально `node dist/last-hearth-landing/server/server.mjs` и:
  ```bash
  for u in / /home /rules/ /wiki /wiki/<существующая> /wiki/net-takoy /news/<id> /settlements/<id> /player/<ник> /nope /profile; do
    printf "%-28s " "$u"; curl -s -o /tmp/p.html -w "%{http_code} %{redirect_url}" "http://localhost:<порт>$u"
    printf " | %s\n" "$(grep -o '<title>[^<]*' /tmp/p.html)"
  done
  ```
  Ожидаемо: `/` — 200 с title главной; `/home` — 301 на `/`; `/rules/` — 301 на `/rules`; статья, новость, поселение, игрок — 200, в HTML **есть текст** статьи/описания и свой title; несуществующая статья и `/nope` — **404**; `/profile` — 200, оболочка.
- `curl -s http://localhost:<порт>/wiki/<статья> | grep -c 'rel="canonical"'` — 1, адрес без параметров.
- В браузере: на каждой странице из п. 2 нет ошибок гидратации, данные не запрашиваются второй раз (вкладка Network).
- Lighthouse (мобильный) для `/`, `/wiki/<статья>`, `/settlements`: в отчёте — LCP и CLS до и после.

## Готово, когда
- у статей, новостей, поселений и игроков в исходном HTML есть контент и свои теги;
- несуществующие адреса отвечают 404;
- главная — `/`, `/home` редиректит;
- sitemap собирается при сборке и содержит динамические страницы;
- `npm run indexnow` с тестовым ключом отправляет только изменившиеся адреса (проверить на подменённом адресе API).

## Не делать
- контентные страницы, разметку schema.org сверх существующей и аналитику — задача 009;
- не менять бэкенд (vsservice) — всё на существующем API;
- не включать SSR для страниц под авторизацией;
- не менять дизайн.

## Отчёт
≤12 строк: что сделано, что нет, вывод проверки curl, Lighthouse до/после, что нужно настроить в Logto и как теперь деплоится (nginx + node). `git commit` + `git push -u origin agent/008`.
