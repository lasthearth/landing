# Last Hearth: подробное решение проблем из аудита

Дата: 05.10.2026. Это продолжение `SEO_RETENTION_AUDIT.md`: по каждой проблеме описано, что сделать, приведён готовый код под текущую кодовую базу (Angular 20.3, `@angular/build:application`, prerender через `routes.txt`, nginx в Docker) и способ проверки.

Код написан по правилам `AGENTS.md` (FSD, один файл — одна сущность, JSDoc, OnPush). JSDoc в примерах сокращён до одной-двух строк; при переносе в проект его нужно развернуть до принятого формата.

## Содержание

0. [Порядок работ](#0-порядок-работ)
1. [Срочно: пароль сервера лежит в публичном JS](#1-срочно-пароль-сервера-лежит-в-публичном-js)
2. [Навигация: кнопки → ссылки](#2-навигация-кнопки--ссылки)
3. [nginx: редиректы, CSR-оболочка, настоящий 404, `/home` → `/`](#3-nginx-редиректы-csr-оболочка-настоящий-404-home--)
4. [Пререндер всех публичных страниц и генерация sitemap](#4-пререндер-всех-публичных-страниц-и-генерация-sitemap)
5. [SeoService и JSON-LD](#5-seoservice-и-json-ld)
6. [index.html: иконки, manifest, schema.org, шрифты](#6-indexhtml-иконки-manifest-schemaorg-шрифты)
7. [Welcome-оверлей только на главной](#7-welcome-оверлей-только-на-главной)
8. [Производительность](#8-производительность)
9. [Контент: новости, поселения, рейтинг, посадочные страницы](#9-контент-новости-поселения-рейтинг-посадочные-страницы)
10. [Внешнее присутствие](#10-внешнее-присутствие)
11. [Аналитика и согласие на cookies](#11-аналитика-и-согласие-на-cookies)
12. [Удержание: онбординг и верификация](#12-удержание-онбординг-и-верификация)
13. [Удержание: первая неделя и поводы возвращаться](#13-удержание-первая-неделя-и-поводы-возвращаться)
14. [Проверка после деплоя](#14-проверка-после-деплоя)
15. [Поправки к аудиту](#15-поправки-к-аудиту)

---

## 0. Порядок работ

| Этап | Что | Разделы | Оценка |
|---|---|---|---|
| День 1 | Пароль сервера, навигация, nginx, пререндер, sitemap | 1–4 | 4–6 ч |
| День 2 | SEO-сервис, JSON-LD, иконки, welcome, шрифты, видео | 5–8 | 4–6 ч |
| День 2–3 | Вебмастер/GSC, Метрика, согласие на cookies | 10–11 | 3–4 ч |
| Неделя 1 | Уведомления о верификации, статус заявки, экран ожидания | 12 | 2–3 дня (фронт + бэк) |
| Неделя 2 | `/news/:id`, RSS, публичные поселения и рейтинг | 9 | 4–5 дней |
| Неделя 3+ | Чек-лист новичка, набор в поселения, календарь, сезон, карта | 13 | итеративно |

Делать в отдельной ветке (например, `feat/seo-fixes`) и после каждого этапа прогонять `npm run build` и проверку из раздела 14 на dev-стенде.

---

## 1. Срочно: пароль сервера лежит в публичном JS

**Проблема.** `gameServerPassword` захардкожен в `src/app/core/config/environments/environment.prod.ts` (и `environment.ts`) и выводится в `features/profile/how-play`. Всё, что лежит в `environment`, попадает в браузерный бандл: в старой сборке `dist/` пароль нашёлся в `chunk-QDOKOCRX.js`. Значит, любой может получить пароль, открыв JS-файл сайта, без регистрации и верификации. Кроме того, пароль есть в истории git.

Если сервер дополнительно закрыт whitelist'ом по нику, ущерба нет и пароль служит лишь формальностью. Если пароль — единственный барьер, верификация сейчас обходится.

### Решение

**Шаг 1. Сменить пароль на игровом сервере.** Старый считать скомпрометированным: он в истории git и в закэшированных бандлах.

**Шаг 2. Отдавать данные подключения с бэкенда только верифицированным.** Новый эндпоинт в vsservice:

```
GET /v1/serverinfo/connection
Auth: Bearer, роль игрока не ниже verified
200 → { "host": "play.lasthearth.ru", "password": "…", "game_version": "1.22.2" }
403 → не верифицирован
```

Пароль бэкенд читает из конфигурации/секрета, а не из кода.

**Шаг 3. Фронтенд.** Убрать `gameServerIp` и `gameServerPassword` из обоих `environment*.ts` и добавить API-сервис.

`src/app/entities/server-connection/model/server-connection.ts`
```ts
/**
 * Данные для подключения к игровому серверу.
 */
export interface ServerConnection {
    /** Адрес сервера. */
    host: string;
    /** Пароль сервера. */
    password: string;
    /** Требуемая версия игры. */
    gameVersion: string;
}
```

`src/app/entities/server-connection/model/server-connection-dto.ts`
```ts
/**
 * DTO ответа `GET /serverinfo/connection`.
 */
export interface ServerConnectionDto {
    host: string;
    password: string;
    game_version: string;
}
```

`src/app/entities/server-connection/api/server-connection.api.ts`
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { ServerConnection } from '../model/server-connection';
import { ServerConnectionDto } from '../model/server-connection-dto';

/**
 * API данных подключения к игровому серверу.
 * Доступно только верифицированным игрокам.
 */
@Injectable({ providedIn: 'root' })
export class ServerConnectionApi {
    private readonly http = inject(HttpClient);

    /**
     * Данные подключения; кэшируются на время сессии.
     */
    public readonly connection$: Observable<ServerConnection> = this.http
        .get<ServerConnectionDto>(`${environment.apiUrl}/serverinfo/connection`)
        .pipe(
            map((dto) => ({ host: dto.host, password: dto.password, gameVersion: dto.game_version })),
            shareReplay({ bufferSize: 1, refCount: false })
        );
}
```

`src/app/entities/server-connection/index.ts`
```ts
export { ServerConnectionApi } from './api/server-connection.api';
export type { ServerConnection } from './model/server-connection';
```

В `how-play.component.ts`:
```ts
protected readonly connection = toSignal(inject(ServerConnectionApi).connection$);
```
В шаблоне заменить `environment.gameServerIp` / `environment.gameServerPassword` на `connection()?.host` / `connection()?.password`, а пока данных нет, показывать скелетон.

**Шаг 4 (рекомендую).** Включить whitelist на сервере Vintage Story и добавлять ник в whitelist при одобрении верификации: бэкенд вызывает серверную команду `/player <ник> whitelist on` через серверный мод/консоль. Тогда пароль вообще перестаёт быть секретом, а смена ника (раз в 6 месяцев, уже реализовано) должна обновлять whitelist.

**Попутно:** `YOUTUBE_CONFIG.apiKey` тоже уходит в браузер. Это нормально для YouTube Data API, но в Google Cloud Console ключ нужно ограничить по HTTP referrer `https://lasthearth.ru/*` и только YouTube Data API v3.

**Проверка:** после сборки `grep -r "<старый пароль>" dist/` ничего не находит.

---

## 2. Навигация: кнопки → ссылки

**Проблема.** В `layout/header/header.component.html` все пункты меню — это `<button [routerLink]>`, а логотип — `<div [routerLink]>`. Такие элементы не получают `href`, поэтому краулер по ним не переходит, а пользователь не может открыть пункт в новой вкладке.

**Решение.** Заменить на `<a routerLink routerLinkActive>`. Ручное поле `select`, которое сейчас выставляется в `header.component.ts` по `RouteKeys`, больше не нужно: подсветку активного пункта даёт `routerLinkActive`.

### 2.1 Десктоп

Было:
```html
<button
    [routerLink]="['/rules']"
    [ngClass]="{ 'nav-button--active': select === 'rules' }"
    class="nav-button md:w-auto px-1.5"
    [attr.aria-label]="'header.nav.rules' | translate"
>
```

Стало:
```html
<a
    routerLink="/rules"
    routerLinkActive="nav-button--active"
    ariaCurrentWhenActive="page"
    class="nav-button md:w-auto px-1.5"
>
    <tui-icon icon="@tui.file-text" aria-hidden="true" />
    <span class="hidden md:block">{{ "header.nav.rules" | translate }}</span>
</a>
```

`aria-label` убрать там, где текст пункта виден (на `md+`). На мобильных подпись скрыта, поэтому вместо `aria-label` добавить скрытый текст: `<span class="sr-only md:hidden">{{ "header.nav.rules" | translate }}</span>`. Так у ссылки всегда есть текст, понятный и скринридеру, и поисковику.

Аналогично для `/start-game`, `/faq`, `/settlements`, `/diplomacy`, `/market`, `/gallery`, `/videos`.

Кнопка «Домой»:
```html
<a
    routerLink="/"
    routerLinkActive="nav-button--active"
    [routerLinkActiveOptions]="{ exact: true }"
    ariaCurrentWhenActive="page"
    class="nav-button"
>
    <tui-icon icon="@tui.house" aria-hidden="true" />
    <span class="sr-only">{{ "header.nav.home" | translate }}</span>
</a>
```

Логотип:
```html
<a
    routerLink="/"
    class="hidden mt-8 z-10 sm:flex w-fit h-18 sm:h-20 items-center justify-start rounded-xl backdrop-blur-md bg-lh-primary-2/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] no-underline"
>
    <!-- содержимое без изменений -->
</a>
```

### 2.2 Мобильное меню и подменю «Медиа»

Пункты мобильного меню тоже сделать ссылками. Закрытие меню остаётся на `(click)`:
```html
<a
    routerLink="/rules"
    routerLinkActive="bg-lh-accent text-white"
    #rulesActive="routerLinkActive"
    [ngClass]="{ 'text-lh-primary hover:bg-surface-3': !rulesActive.isActive }"
    (click)="showMobileMenu.set(false)"
    class="w-full px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors flex items-center gap-2 no-underline"
>
    <tui-icon icon="@tui.file-text" class="size-4!" aria-hidden="true" />
    {{ "header.nav.rules" | translate }}
</a>
```

Важно: само мобильное меню рендерится только по `@if (showMobileMenu())`, то есть в пререндере его нет. Это нормально, потому что десктопный блок `hidden md:contents` в HTML присутствует (он скрыт CSS-ом, а не `@if`), и краулер найдёт ссылки в нём. Проверить это после сборки (раздел 14).

Подменю «Медиа» на десктопе открывается по клику и тоже рендерится через `@if`. Поэтому ссылки на `/gallery` и `/videos` нужно продублировать в подвале (см. 2.4).

### 2.3 header.component.ts

- В `imports` добавить `RouterLinkActive`.
- Удалить поле `select` и подписку на `NavigationEnd`, которая переключает его через `switch (RouteKeys…)`.
- `isMediaActive` (подсветка кнопки «Медиа») вычислять через роутер:

```ts
private readonly router = inject(Router);

/**
 * Активен ли один из разделов «Медиа».
 */
protected readonly isMediaActive = toSignal(
    this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => /^\/(gallery|videos)(\/|$)/.test(e.urlAfterRedirects))
    ),
    { initialValue: false }
);
```

В шаблоне: `isMediaActive()` вместо `isMediaActive`.

### 2.4 Стили и подвал

В `src/styles.css` у `.nav-button` добавить сброс оформления ссылок:
```css
a.nav-button,
a.nav-button:hover,
a.nav-button:visited {
    text-decoration: none;
    color: var(--color-white);
}
```

В подвал (`layout/footer/footer.component.html`) добавить блок ссылок на все публичные разделы, для краулера и как запасная навигация:
```html
<nav aria-label="Разделы сайта" class="flex flex-wrap gap-x-4 gap-y-2">
    <a routerLink="/start-game">Как начать играть</a>
    <a routerLink="/rules">Правила</a>
    <a routerLink="/faq">FAQ</a>
    <a routerLink="/settlements">Поселения</a>
    <a routerLink="/diplomacy">Дипломатия</a>
    <a routerLink="/news">Новости</a>
    <a routerLink="/gallery">Галерея</a>
    <a routerLink="/videos">Видео</a>
    <a routerLink="/market">Магазин</a>
</nav>
```
Тексты вынести в `footer.i18n.ts`. Ссылку `/news` добавлять после раздела 9.1.

**Проверка:** в `dist/last-hearth-landing/browser/index.html` есть `href="/rules"`, `href="/faq"`, `href="/diplomacy"` и т. д.

---

## 3. nginx: редиректы, CSR-оболочка, настоящий 404, `/home` → `/`

**Проблемы.**
- `try_files $uri $uri/ /index.html` на `/rules` находит каталог `rules/` и отвечает 301 на `/rules/`. Так как TLS заканчивается до nginx, а `absolute_redirect` включён, в `Location` уходит адрес с неверной схемой/портом.
- Fallback на `/index.html` отдаёт **пререндеренную главную** для всего, что не пререндерено.
- Нет настоящего 404.

Сборка уже кладёт пустую оболочку SPA в `index.csr.html` (проверено в `dist/…/browser/index.csr.html` и в исходниках `@angular/build`: при включённом prerender `index.html` переименовывается в `index.csr.html`). Ей и нужно отдавать непререндеренные разделы.

### 3.1 Новый `nginx.conf`

Конфигурация проверена на nginx в изолированной копии с той же структурой `dist`: результаты в таблице ниже.

```nginx
events {}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  server_tokens off;
  sendfile on;
  tcp_nopush on;

  # Сборка отдаёт ~2.2 MB JS; gzip сокращает до ~380 kB.
  gzip on;
  gzip_vary on;
  gzip_comp_level 6;
  gzip_min_length 1024;
  gzip_proxied any;
  gzip_types
    text/plain
    text/css
    text/javascript
    application/javascript
    application/json
    application/manifest+json
    application/xml
    application/rss+xml
    image/svg+xml;

  server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;

    # TLS заканчивается на внешнем прокси: Location должен быть относительным,
    # иначе nginx подставит http:// и внутренний порт 8080.
    absolute_redirect off;
    port_in_redirect off;

    # /home и /home/ → / (query сохраняется: важно для OIDC-колбэка ?code=…).
    rewrite ^/home/?$ / permanent;

    # Единый вид URL без завершающего слэша.
    rewrite ^/(.+)/$ /$1 permanent;

    location = /unauthorized { return 301 /; }

    # Хешированные бандлы.
    location ~* \.(?:js|css)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
      try_files $uri =404;
    }

    # Статика без хеша.
    location ~* \.(?:webp|avif|png|jpe?g|gif|svg|ico|mp4|webm|woff2?|webmanifest|json|xml|txt)$ {
      expires 7d;
      add_header Cache-Control "public";
      try_files $uri =404;
    }

    # Разделы, которые рендерятся только на клиенте (за авторизацией).
    location ^~ /profile {
      add_header Cache-Control "no-cache";
      try_files /index.csr.html =404;
    }

    # Новости и поселения (раздел 9): берём пререндер, а если страница
    # появилась после последней сборки — CSR-оболочку. Компонент сам
    # выставит noindex, если сущность не найдена.
    location ^~ /news/ {
      add_header Cache-Control "no-cache";
      try_files $uri/index.html /index.csr.html =404;
    }
    location ^~ /settlements/ {
      add_header Cache-Control "no-cache";
      try_files $uri/index.html /index.csr.html =404;
    }

    location = / {
      add_header Cache-Control "no-cache";
      try_files /index.html =404;
    }

    # Всё остальное — только пререндеренные страницы, иначе настоящий 404.
    location / {
      add_header Cache-Control "no-cache";
      try_files $uri/index.html =404;
    }

    error_page 404 /404/index.html;
    location = /404/index.html {
      internal;
      add_header Cache-Control "no-cache" always;
    }
  }
}
```

Результат на тестовом стенде:

| Запрос | Ответ |
|---|---|
| `/` | 200, пререндер главной |
| `/home` | 301 → `/` |
| `/home/?code=1&state=2` | 301 → `/?code=1&state=2` |
| `/rules` | 200, пререндер правил (без редиректа) |
| `/rules/` | 301 → `/rules` |
| `/gallery`, `/news/<id>` | 200, если страница пререндерена |
| `/news/<новый id>`, `/settlements/<новый id>` | 200, `index.csr.html` (ещё не пересобрано) |
| `/profile`, `/profile/stats` | 200, `index.csr.html` |
| `/nope`, `/nope/deep`, `/chunk-NOPE.js` | **404** + страница 404 |
| `/index.html`, `/rules/index.html` | 404 (дубли больше не отдаются) |
| `/chunk-ABC.js` | 200, `Cache-Control: public, immutable` |

**Важно:** при такой конфигурации любой новый публичный роут обязан быть пререндерен (раздел 4) или добавлен в `location ^~ /…` с CSR-оболочкой. Иначе он будет отдавать 404. Сюда же относятся будущие CSR-разделы, если появятся.

### 3.2 Канонический адрес главной и OIDC

После редиректа `/home` → `/`:

1. `environment.prod.ts` и `environment.ts`:
   ```ts
   redirectUri: 'https://lasthearth.ru/',
   postLogoutRedirectUri: 'https://lasthearth.ru/',
   ```
   (в dev-окружении — свой адрес).
2. В Logto Console → Applications → приложение `u9k3c8kap0lyhhs0o5jn1`:
   - добавить `https://lasthearth.ru/` в Redirect URIs и Post sign-out redirect URIs;
   - старый `https://lasthearth.ru/home/` оставить на пару недель (редирект nginx сохраняет `?code=…&state=…`), потом удалить.
3. `routes/seo-data.ts`: `home.url = siteUrl + '/'`; то же в `defaultSeo` в `app.component.ts`.
4. В `app.routes.ts` маршрут `path: 'home'` заменить на клиентский редирект для старых закладок внутри SPA:
   ```ts
   { path: 'home', redirectTo: '', pathMatch: 'full' },
   ```
5. Заменить `'/home'` на `'/'` везде, где он встречается: `layout/header/header.component.html` (строки 13 и 274), `features/not-found/not-found.component.html`, `core/guards/admin.guard.ts`, `core/guards/user.guard.ts`, `redirectTo: '/home'` у роута `unauthorized` в `app.routes.ts`. В `features/news/components/create-news-form/create-news.component.ts` ссылка на новость для Discord сейчас ведёт на `/home`: после раздела 9.1 она должна вести на `/news/<id>`.
6. `routes.txt`: убрать строку `/home`.

### 3.3 Dockerfile

Глобальная установка `@angular/cli@17` не нужна (в проекте Angular 20, используется локальный CLI), а `npm ci` воспроизводимее `npm i`. Сборка через `npm run build`, чтобы автоматически отработал `prebuild` из раздела 4:
```dockerfile
FROM node:22.21.1-alpine3.23 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# prebuild генерирует routes.generated.txt и sitemap.xml (раздел 4)
RUN npm run build

FROM nginx:alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/last-hearth-landing/browser /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

Если перед nginx стоит внешний прокси (Caddy/Traefik/Nginx Proxy Manager), проверьте, что он сам не добавляет и не убирает завершающий слэш. Иначе редиректы двух уровней зациклятся.

---

## 4. Пререндер всех публичных страниц и генерация sitemap

**Проблемы.** `/gallery`, `/videos`, `/diplomacy` не пререндерятся. `sitemap.xml` написан руками: в нём нет этих страниц, `lastmod` не меняется с июня, зато есть noindex-страницы. Будущие `/news/:id` и `/settlements/:id` руками не перечислить.

**Решение.** Перед сборкой скрипт формирует список роутов и `sitemap.xml` из статического списка и API.

### 4.1 `scripts/generate-routes.mjs`

Скрипт проверен на mock-API: пагинация новостей, оба формата дат API (ISO у новостей и unix-секунды строкой у `updated_at` поселений), экранирование HTML в заголовках, валидность XML у sitemap и RSS, падение API (сборка продолжается со статическими роутами). Флаги `INCLUDE_NEWS_PAGES` / `INCLUDE_SETTLEMENT_PAGES` и закомментированные `/news`, `/leaderboard` включаются по мере готовности страниц из раздела 9: пререндер несуществующего роута дал бы страницу 404 с кодом 200.

Помимо `routes.generated.txt` и `sitemap.xml`, при включённых новостях скрипт пишет `public/rss.xml` (раздел 9.1).

```js
/**
 * Генерирует список роутов для пререндера и sitemap.xml.
 *
 * Запускается перед `ng build` (npm-скрипт `prebuild`).
 * - routes.generated.txt — все публичные страницы, включая /news/:id и /settlements/:id;
 * - public/sitemap.xml   — те же страницы с lastmod.
 *
 * Если API недоступно, сборка не падает: в файлы попадут только статические роуты.
 */
import { writeFile } from 'node:fs/promises';

const SITE_URL = 'https://lasthearth.ru';
const API_URL = process.env.LH_API_URL ?? 'https://api.lasthearth.ru/v1';
const FETCH_TIMEOUT_MS = 15_000;

/** Включить, когда появятся страницы /news/:id (раздел 9.1). */
const INCLUDE_NEWS_PAGES = false;

/** Включить, когда появятся страницы /settlements/:id (раздел 9.2). */
const INCLUDE_SETTLEMENT_PAGES = false;

/**
 * Статические публичные страницы.
 * `index: false` — пререндерится, но в sitemap не попадает (noindex-страницы).
 */
const STATIC_ROUTES = [
    { path: '/', index: true },
    { path: '/start-game', index: true },
    { path: '/rules', index: true },
    { path: '/faq', index: true },
    // { path: '/news', index: true },        // включить после раздела 9.1
    { path: '/settlements', index: true },
    { path: '/diplomacy', index: true },
    // { path: '/leaderboard', index: true }, // включить после раздела 9.3
    { path: '/gallery', index: true },
    { path: '/videos', index: true },
    { path: '/market', index: true },
    { path: '/privacy-policy', index: false },
    { path: '/public-offer', index: false },
    { path: '/404', index: false },
];

/**
 * GET-запрос к API с таймаутом.
 *
 * @param {string} path Путь относительно API_URL.
 * @returns {Promise<any>} Распарсенный JSON.
 */
async function getJson(path) {
    const response = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`${path}: HTTP ${response.status}`);
    }
    return response.json();
}

/** Новости, загруженные для RSS. */
const newsItems = [];

/**
 * Все новости с учётом пагинации.
 *
 * @returns {Promise<Array<{ path: string, lastmod?: string }>>}
 */
async function loadNewsRoutes() {
    const routes = [];
    let pageToken = '';
    do {
        const query = new URLSearchParams({ page_size: '50' });
        if (pageToken) {
            query.set('page_token', pageToken);
        }
        const data = await getJson(`/news?${query}`);
        for (const item of data.news ?? []) {
            routes.push({ path: `/news/${item.id}`, lastmod: toIsoDate(item.created_at), index: true });
            newsItems.push(item);
        }
        pageToken = data.next_page_token ?? '';
    } while (pageToken);
    return routes;
}

/**
 * Все одобренные поселения.
 *
 * @returns {Promise<Array<{ path: string, lastmod?: string }>>}
 */
async function loadSettlementRoutes() {
    const data = await getJson('/settlements');
    return (data.settlements ?? []).map((item) => ({
        path: `/settlements/${item.id}`,
        lastmod: toIsoDate(item.updated_at),
        index: true,
    }));
}

/**
 * Приводит дату API к формату YYYY-MM-DD.
 * API отдаёт либо ISO-строку, либо unix-время в секундах строкой.
 *
 * @param {string | undefined} value Значение из API.
 * @returns {string | undefined}
 */
function toIsoDate(value) {
    if (!value) {
        return undefined;
    }
    const date = /^\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/**
 * Загружает динамические роуты, не роняя сборку при ошибке.
 *
 * @param {string} name Название источника для лога.
 * @param {() => Promise<Array>} loader Загрузчик.
 */
async function safeLoad(name, loader) {
    try {
        const routes = await loader();
        console.log(`[routes] ${name}: ${routes.length}`);
        return routes;
    } catch (error) {
        console.warn(`[routes] ${name}: пропущено (${error.message})`);
        return [];
    }
}

/**
 * Экранирует спецсимволы XML.
 *
 * @param {string} value Строка.
 */
function escapeXml(value) {
    return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

/** Сколько последних новостей отдавать в RSS. */
const RSS_LIMIT = 20;

/**
 * Убирает HTML-теги и сжимает пробелы.
 *
 * @param {string} html Исходный HTML.
 */
function stripHtml(html) {
    return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Собирает RSS 2.0 из новостей (новые сверху).
 *
 * @param {Array<any>} items Новости из API.
 */
function buildRss(items) {
    const sorted = [...items]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, RSS_LIMIT);
    const entries = sorted
        .map((item) => {
            const url = `${SITE_URL}/news/${item.id}`;
            const text = stripHtml(item.content);
            const description = text.length > 500 ? `${text.slice(0, 497)}...` : text;
            const pubDate = item.created_at ? `\n      <pubDate>${new Date(item.created_at).toUTCString()}</pubDate>` : '';
            const image = item.preview ? `\n      <enclosure url="${escapeXml(item.preview)}" type="image/webp" length="0" />` : '';
            return `    <item>
      <title>${escapeXml(item.title ?? '')}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>${pubDate}
      <description>${escapeXml(description)}</description>${image}
    </item>`;
        })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Новости Last Hearth</title>
    <link>${SITE_URL}/news</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Новости ролевого сервера Last Hearth (Vintage Story)</description>
    <language>ru</language>
${entries}
  </channel>
</rss>
`;
}

const dynamicRoutes = [
    ...(INCLUDE_NEWS_PAGES ? await safeLoad('news', loadNewsRoutes) : []),
    ...(INCLUDE_SETTLEMENT_PAGES ? await safeLoad('settlements', loadSettlementRoutes) : []),
];
const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes];

await writeFile('routes.generated.txt', allRoutes.map((r) => r.path).join('\n') + '\n');

const urls = allRoutes
    .filter((r) => r.index)
    .map((r) => {
        const loc = `    <loc>${escapeXml(SITE_URL + (r.path === '/' ? '/' : r.path))}</loc>`;
        const lastmod = r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : '';
        return `  <url>\n${loc}${lastmod}\n  </url>`;
    })
    .join('\n');

await writeFile(
    'public/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);

if (INCLUDE_NEWS_PAGES && newsItems.length > 0) {
    await writeFile('public/rss.xml', buildRss(newsItems));
    console.log(`[routes] rss: ${Math.min(newsItems.length, RSS_LIMIT)}`);
}

console.log(`[routes] всего роутов: ${allRoutes.length}`);
```

### 4.2 Подключение

`package.json`:
```json
"scripts": {
    "prebuild": "node scripts/generate-routes.mjs",
    "build": "ng build",
    ...
}
```

`angular.json` → `projects.last-hearth-landing.architect.build.options.prerender`:
```json
"prerender": {
    "routesFile": "routes.generated.txt",
    "discoverRoutes": false
}
```

`.gitignore`:
```
/routes.generated.txt
/public/sitemap.xml
/public/rss.xml
```
Старые `routes.txt` и `public/sitemap.xml` удалить из репозитория (`git rm`).

Для локальной сборки без доступа к API: `LH_API_URL=http://localhost:8081/v1 npm run build`.

### 4.3 Что учесть при пререндере

- **Галерея и дипломатия на сервере ничего не загружают** (`DiscordGalleryService` и `DiplomacyPageComponent` проверяют `isPlatformBrowser`). После пререндера у страниц будут правильные title/description/H1, но без контента. Для дипломатии стоит разрешить загрузку на сервере: это текст, ценный для поиска, а запрос идёт в собственный backend-прокси, а не напрямую в Discord. Достаточно убрать `isPlatformBrowser` в загрузке данных (оставив его для таймеров и `window`).
- **Сборка становится зависимой от свежести данных.** Новость или поселение, созданные после сборки, попадут в пререндер только после следующей сборки. До этого nginx отдаст для них CSR-оболочку (раздел 3.1), то есть ссылки не сломаются. Рекомендации:
  - ночная пересборка по расписанию (cron в CI или на сервере: `docker compose build && docker compose up -d`);
  - пересборка по вебхуку после публикации новости (бэкенд дёргает CI).
- **Счётчик просмотров.** По контракту `GET /news/{id}` увеличивает `view_count`, а при пререндере каждая сборка будет вызывать его для каждой новости. Лучше на бэкенде перестать инкрементировать счётчик в GET (для этого уже есть `POST /news/{id}/views`), либо на сервере брать новость из списка `GET /news` (раздел 9.1).

### 4.4 robots.txt

`public/robots.txt`:
```
User-agent: *
Disallow: /profile
Disallow: /*?ref=

Sitemap: https://lasthearth.ru/sitemap.xml
```

- `Disallow: /settlements/*` убрать: он закроет будущие страницы поселений.
- `Disallow: /*?ref=` закрывает реферальные ссылки (`ReferralApplierService` читает `?ref=`), чтобы они не плодили дубли. На сами страницы при этом указывает canonical без параметров (раздел 5).
- `Allow: /` не нужен: всё, что не запрещено, разрешено.
- Для Яндекса дополнительно `Clean-param: ref /` — Яндекс склеит такие адреса с адресом без параметра:
  ```
  User-agent: Yandex
  Disallow: /profile
  Clean-param: ref /
  ```
  У Яндекса и Google отдельные группы: при наличии группы `User-agent: Yandex` Яндекс читает только её, поэтому `Disallow: /profile` там повторяется.

---

## 5. SeoService и JSON-LD

### 5.1 Что меняется

| Было | Стало |
|---|---|
| `robots` выставляется, только если задан; после noindex-страницы остаётся `noindex` до перезагрузки | Всегда выставляется: по умолчанию `index, follow, max-image-preview:large` |
| `<link rel="canonical">` создаётся всегда; у 404 указывает на главную | Ставится только при наличии `url`, иначе удаляется |
| `meta keywords` | Удаляется: Google и Яндекс его не учитывают |
| `og:image` только при наличии `image`; у юридических страниц превью пустое | Всегда, с картинкой по умолчанию |
| Новые страницы (`/news/:id`, `/settlements/:id`) не могут задать свои теги после загрузки данных | Компонент вызывает `setSeoTags` после загрузки |
| JSON-LD только статичный в `index.html` | `JsonLdService`: разметка на уровне страницы, рендерится и при пререндере |

### 5.2 `ISeoData`

`src/app/core/types/i-seo-data.ts`: поле `keywords` удалить, добавить:
```ts
    /**
     * Название страницы для хлебных крошек (BreadcrumbList).
     * Не задаётся для главной и служебных страниц.
     */
    breadcrumb?: string;

    /**
     * Дата публикации (ISO 8601) — для статей и новостей.
     */
    publishedTime?: string;
```

В `routes/seo-data.ts`: удалить `keywords` у всех страниц, у главной `url: siteUrl + '/'`, у `notFound` удалить `url`, добавить `breadcrumb` (`'Правила'`, `'FAQ'`, `'Как начать играть'`, `'Поселения'`, `'Дипломатия'`, `'Галерея'`, `'Видео'`, `'Магазин'`). Плюс исправить описание магазина (раздел 9.6).

### 5.3 `SeoService` целиком

`src/app/core/services/seo.service.ts`:
```ts
import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ISeoData } from '@core/types/i-seo-data';

/**
 * Сервис SEO-тегов страницы: title, description, robots, canonical, Open Graph, Twitter Cards.
 * Работает и в браузере, и при пререндере.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
    /** Изображение по умолчанию для превью. */
    private static readonly DEFAULT_IMAGE = 'https://lasthearth.ru/og-image.jpg';

    /** Значение robots по умолчанию. */
    private static readonly DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    /**
     * Устанавливает SEO-теги страницы.
     *
     * @param seo Данные страницы.
     */
    public setSeoTags(seo: ISeoData): void {
        this.title.setTitle(seo.title);
        this.meta.updateTag({ name: 'description', content: seo.description });
        this.meta.updateTag({ name: 'robots', content: seo.robots ?? SeoService.DEFAULT_ROBOTS });
        this.meta.removeTag("name='keywords'");

        const image = seo.image ?? SeoService.DEFAULT_IMAGE;

        this.meta.updateTag({ property: 'og:title', content: seo.title });
        this.meta.updateTag({ property: 'og:description', content: seo.description });
        this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });
        this.meta.updateTag({ property: 'og:site_name', content: seo.siteName ?? 'Last Hearth' });
        this.meta.updateTag({ property: 'og:locale', content: seo.locale ?? 'ru_RU' });
        this.meta.updateTag({ property: 'og:image', content: image });
        this.meta.updateTag({ property: 'og:image:alt', content: seo.imageAlt ?? seo.title });
        this.setOrRemove('og:url', seo.url);
        this.setOrRemove('article:published_time', seo.publishedTime);

        // Размеры указываем только для своей картинки 1200×630; у превью новостей размер неизвестен.
        if (image === SeoService.DEFAULT_IMAGE) {
            this.meta.updateTag({ property: 'og:image:width', content: '1200' });
            this.meta.updateTag({ property: 'og:image:height', content: '630' });
        } else {
            this.meta.removeTag("property='og:image:width'");
            this.meta.removeTag("property='og:image:height'");
        }

        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.meta.updateTag({ name: 'twitter:title', content: seo.title });
        this.meta.updateTag({ name: 'twitter:description', content: seo.description });
        this.meta.updateTag({ name: 'twitter:image', content: image });

        this.setCanonical(seo.url);
    }

    /**
     * Ставит или удаляет OG-тег.
     *
     * @param property Имя свойства.
     * @param content Значение; при отсутствии тег удаляется.
     */
    private setOrRemove(property: string, content?: string): void {
        if (content) {
            this.meta.updateTag({ property, content });
        } else {
            this.meta.removeTag(`property='${property}'`);
        }
    }

    /**
     * Ставит canonical или удаляет его, если URL не задан.
     *
     * @param url Канонический URL.
     */
    private setCanonical(url?: string): void {
        let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

        if (!url) {
            link?.remove();
            return;
        }

        if (!link) {
            link = this.document.createElement('link');
            link.setAttribute('rel', 'canonical');
            this.document.head.appendChild(link);
        }

        link.setAttribute('href', url);
    }
}
```

`Renderer2` в этом сервисе не нужен: в Angular SSR `DOCUMENT` — полноценный DOM, а сервис не работает с элементами компонентов.

### 5.4 `JsonLdService`

`src/app/core/services/json-ld.service.ts`:
```ts
import { DOCUMENT, inject, Injectable } from '@angular/core';

/**
 * Управляет блоками JSON-LD в <head>.
 * Каждый блок идентифицируется ключом; повторный вызов с тем же ключом заменяет блок.
 */
@Injectable({ providedIn: 'root' })
export class JsonLdService {
    private readonly document = inject(DOCUMENT);

    /**
     * Устанавливает или удаляет блок JSON-LD.
     *
     * @param key Ключ блока: 'route' — из данных роута, 'page' — из компонента, 'breadcrumbs'.
     * @param data Объект schema.org; null удаляет блок.
     */
    public set(key: string, data: object | null): void {
        const selector = `script[type="application/ld+json"][data-ld="${key}"]`;
        const existing = this.document.head.querySelector<HTMLScriptElement>(selector);

        if (!data) {
            existing?.remove();
            return;
        }

        const script = existing ?? this.document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-ld', key);
        // Экранирование `<` не даёт закрыть <script> содержимым из API.
        script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');

        if (!existing) {
            this.document.head.appendChild(script);
        }
    }
}
```

### 5.5 Хлебные крошки

`src/app/core/lib/build-breadcrumbs.function.ts`:
```ts
/**
 * Строит BreadcrumbList для schema.org.
 *
 * @param items Цепочка от корня: название и абсолютный URL.
 * @returns Объект schema.org.
 */
export function buildBreadcrumbs(items: { name: string; url: string }[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}
```

### 5.6 `AppComponent`

Подписка на `NavigationEnd` теперь ставит и теги, и крошки:
```ts
private readonly jsonLd = inject(JsonLdService);

public constructor() {
    this.router.events
        .pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.getActiveRouteSeoData()),
            takeUntilDestroyed()
        )
        .subscribe((seo) => {
            this.seoService.setSeoTags(seo);
            this.jsonLd.set(
                'breadcrumbs',
                seo.breadcrumb && seo.url
                    ? buildBreadcrumbs([
                          { name: 'Last Hearth', url: 'https://lasthearth.ru/' },
                          { name: seo.breadcrumb, url: seo.url },
                      ])
                    : null
            );
        });
}
```

Вызов `this.seoService.setSeoTags(this.defaultSeo)` в начале конструктора убрать: теги ставятся на первом `NavigationEnd`, а промежуточная установка дефолтных тегов только создаёт лишнюю работу.

### 5.7 Страницы с данными

Компонент, который загружает сущность (новость, поселение), сам ставит теги после загрузки. Общий принцип показан в разделе 9.1. Если сущность не найдена:
```ts
this.seo.setSeoTags({ title: 'Не найдено — Last Hearth', description: '…', robots: 'noindex, follow' });
```

### 5.8 FAQPage из уже сверстанных ответов

Чтобы не дублировать тексты ответов в отдельной константе, JSON-LD собирается из DOM страницы FAQ, и при пререндере тоже: в `ngAfterViewInit` на сервере доступен DOM компонента, а свёрнутые ответы `tui-expand` уже лежат в HTML.

В `faq.component.html` разметить каждый пункт тремя атрибутами:
```html
<div class="lh-panel faq-scroll" data-faq-item>
    <div (click)="isServerConcept = !isServerConcept" class="…">
        <p class="…" data-faq-q>{{ "faq.questions.serverConcept" | translate }}</p>
        …
    </div>
    <tui-expand [expanded]="isServerConcept">
        <div class="…" data-faq-a>
            …ответ…
        </div>
    </tui-expand>
</div>
```

В `faq.component.ts`:
```ts
private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
private readonly jsonLd = inject(JsonLdService);
private readonly destroyRef = inject(DestroyRef);

/**
 * Собирает FAQPage из отрисованных вопросов и ответов.
 */
public ngAfterViewInit(): void {
    const clean = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

    const mainEntity = Array.from(this.host.nativeElement.querySelectorAll('[data-faq-item]'))
        .map((item) => ({
            '@type': 'Question',
            name: clean(item.querySelector('[data-faq-q]')),
            acceptedAnswer: { '@type': 'Answer', text: clean(item.querySelector('[data-faq-a]')) },
        }))
        .filter((q) => q.name && q.acceptedAnswer.text);

    this.jsonLd.set('page', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity });
    this.destroyRef.onDestroy(() => this.jsonLd.set('page', null));
}
```

Ожидания от FAQPage стоит держать реалистичными: с 2023 года Google показывает FAQ-сниппеты в основном для авторитетных государственных и медицинских сайтов. Разметка всё равно помогает поисковикам понять страницу, и её стоит добавить, но заметного роста кликов в Google ждать не нужно.

Сейчас вопросы FAQ раскрываются через `(click)` на `div`, и с клавиатуры это недоступно. Заодно стоит сделать заголовок вопроса `<button type="button" [attr.aria-expanded]="isServerConcept">`. На SEO это не влияет, но улучшает доступность.

---

## 6. index.html: иконки, manifest, schema.org, шрифты

### 6.1 Иконки и логотипы

Сейчас фавиконка, `apple-touch-icon` и логотип в schema.org указывают на `logo.ico` (один кадр 256×256, 96 КБ), и тот же файл грузится как логотип в шапке. `/favicon.ico` в корне нет (404), а Яндекс берёт фавиконку для выдачи именно оттуда.

`scripts/generate-icons.mjs` (проверен на `public/images/logo.png` 512×512; запускается один раз, результат коммитится):
```js
/**
 * Генерирует favicon, иконки PWA и логотипы из public/images/logo.png (512×512).
 * Запуск: node scripts/generate-icons.mjs (результат коммитится, в prebuild не нужен).
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';

const SOURCE = 'public/images/logo.png';

/** PNG-иконки: имя файла → размер. */
const PNG_ICONS = {
    'public/apple-touch-icon.png': 180,
    'public/icon-192.png': 192,
    'public/icon-512.png': 512,
    'public/images/logo-112.png': 112,
};

for (const [file, size] of Object.entries(PNG_ICONS)) {
    await sharp(SOURCE).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(file);
}

// Иконка с отступами для Android (maskable): логотип занимает ~80% холста.
await sharp(SOURCE)
    .resize(410, 410)
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#ffffff' })
    .png({ compressionLevel: 9, palette: true })
    .toFile('public/icon-maskable-512.png');

// Логотип для шапки сайта: webp 2× от отображаемых 56px.
await sharp(SOURCE).resize(112, 112).webp({ quality: 90 }).toFile('public/images/logo-112.webp');

// favicon.ico с размерами 16/32/48.
const icoSources = await Promise.all([16, 32, 48].map((s) => sharp(SOURCE).resize(s, s).png().toBuffer()));
await writeFile('public/favicon.ico', await pngToIco(icoSources));

console.log('icons: done');
```

Установка и запуск:
```bash
npm i -D png-to-ico
node scripts/generate-icons.mjs
```

Получится (размеры из тестового прогона):

| Файл | Размер |
|---|---|
| `public/favicon.ico` (16/32/48) | 15 КБ |
| `public/apple-touch-icon.png` (180) | 17 КБ |
| `public/icon-192.png` | 18 КБ |
| `public/icon-512.png` | 91 КБ |
| `public/icon-maskable-512.png` | 67 КБ |
| `public/images/logo-112.webp` (для шапки) | 7 КБ |

В шапке (`header.component.html`) и подвале заменить `src="/logo.ico"` на `src="/images/logo-112.webp"`. Это минус ~90 КБ на каждой странице.

У логотипа белый фон, поэтому у maskable-иконки фон отступов тоже белый (`#ffffff` в скрипте).

### 6.2 `public/site.webmanifest`

```json
{
    "name": "Last Hearth — ролевой сервер Vintage Story",
    "short_name": "Last Hearth",
    "lang": "ru",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "background_color": "#2a231d",
    "theme_color": "#332c26",
    "icons": [
        { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
}
```

### 6.3 Новый `<head>`

Скрипт темы и splash-экран остаются как есть. Меняется блок мета-тегов, иконок, шрифтов и JSON-LD:

```html
<!doctype html>
<html lang="ru">
    <head>
        <meta charset="utf-8" />
        <title>Last Hearth — ролевой сервер Vintage Story</title>
        <base href="/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <!-- скрипт темы без изменений -->

        <meta
            name="description"
            content="Last Hearth — ролевой политико-экономический сервер Vintage Story. Развивайте поселения, ведите войны, заключайте союзы и участвуйте в жизни Империи."
        />
        <meta name="theme-color" content="#332c26" />

        <!-- Подтверждение прав (значения из Вебмастера и Search Console, раздел 10) -->
        <meta name="yandex-verification" content="ЗАМЕНИТЬ" />
        <meta name="google-site-verification" content="ЗАМЕНИТЬ" />

        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        <link rel="preconnect" href="https://api.lasthearth.ru" crossorigin />
        <link rel="alternate" type="application/rss+xml" title="Новости Last Hearth" href="/rss.xml" />

        <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Organization",
                        "@id": "https://lasthearth.ru/#org",
                        "name": "Last Hearth",
                        "alternateName": "Последний очаг",
                        "url": "https://lasthearth.ru/",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://lasthearth.ru/images/logo.png",
                            "width": 512,
                            "height": 512
                        },
                        "sameAs": [
                            "https://discord.com/invite/FZb7SGrSFy",
                            "https://www.youtube.com/@LISOVCORP",
                            "https://boosty.to/lisov",
                            "https://docs.lasthearth.ru/"
                        ]
                    },
                    {
                        "@type": "WebSite",
                        "@id": "https://lasthearth.ru/#website",
                        "name": "Last Hearth",
                        "alternateName": "Last Hearth — ролевой сервер Vintage Story",
                        "url": "https://lasthearth.ru/",
                        "inLanguage": "ru",
                        "publisher": { "@id": "https://lasthearth.ru/#org" }
                    },
                    {
                        "@type": "GameServer",
                        "@id": "https://lasthearth.ru/#server",
                        "name": "Last Hearth",
                        "url": "https://lasthearth.ru/",
                        "game": {
                            "@type": "VideoGame",
                            "name": "Vintage Story",
                            "url": "https://www.vintagestory.at/"
                        },
                        "serverStatus": "https://schema.org/OnlineServerStatus"
                    }
                ]
            }
        </script>
    </head>
```

Что изменилось и почему:
- `translate="no"` убран с `<html>`: он запрещает браузерный перевод иностранцам. Если какие-то элементы переводить нельзя (ники, названия поселений), ставить `translate="no"` точечно на них.
- `meta keywords` удалён.
- `WebSite.SearchAction` удалён: поиск `/faq?q=` не реализован, такая разметка некорректна.
- Тип `VideoGame` с `applicationCategory: "GameServer"` заменён на `GameServer`, который ссылается на игру Vintage Story. Это точнее описывает сайт; `WebSite.name` при этом подсказывает Google название сайта для выдачи.
- В `sameAs` добавлен docs.lasthearth.ru. Добавьте сюда официальные Telegram-канал, VK и канал RuTube, если они есть (`t.me/lisovcd` — это контакт для набора в команду, а не канал проекта, его в `sameAs` не нужно).
- `preconnect` к Google Fonts убраны вместе со шрифтами (6.4). `preconnect` к API получил `crossorigin`: запросы `fetch` к API идут в режиме CORS, и без атрибута соединение не переиспользуется.
- Ссылку на RSS (`/rss.xml`) добавлять, когда будет готов раздел 9.1.
- Clarity из `<head>` уходит в `AnalyticsService` с согласием (раздел 11).

### 6.4 Шрифты: самостоятельная раздача

Сейчас в `<head>` блокирующий CSS из Google Fonts с тремя семействами, плюс `taiga-ui-fonts.less` через `@import` грузит Manrope. Google Fonts из РФ работает нестабильно, а это ещё два сторонних соединения до первого рендера.

```bash
npm i @fontsource-variable/advent-pro @fontsource/alegreya @fontsource/almendra
```

`angular.json` → `build.options.styles`:
```json
"styles": [
    "@fontsource-variable/advent-pro/wght.css",
    "@fontsource/alegreya/400.css",
    "@fontsource/alegreya/500.css",
    "@fontsource/alegreya/700.css",
    "@fontsource/almendra/400.css",
    "@fontsource/almendra/700.css",
    "@taiga-ui/core/styles/taiga-ui-theme.less",
    "@taiga-ui/addon-mobile/styles/taiga-ui-mobile.less",
    "src/styles.css",
    "src/app/shared/styles/variables.less",
    "src/app/shared/styles/appearances/icon.appearance.css"
]
```
(`@taiga-ui/core/styles/taiga-ui-fonts.less` убран.)

Fontsource разбивает шрифты по `unicode-range`: браузер скачает только кириллицу и латиницу. В вариативном пакете семейство называется `'Advent Pro Variable'`, поэтому в `src/styles.css` во всех местах (строки 331, 410, 450, 485):
```css
font-family: 'Advent Pro Variable', 'Advent Pro', serif !important;
```

Taiga UI берёт шрифт своих компонентов из `--tui-font-text` / `--tui-font-heading` (по умолчанию Manrope). Нужно выбрать один из двух вариантов:
- Компоненты Taiga (поля ввода, кнопки, диалоги) должны быть в фирменном шрифте: в `:root` в `styles.css` добавить
  ```css
  :root {
      --tui-font-text: 'Advent Pro Variable', serif;
      --tui-font-heading: 'Advent Pro Variable', serif;
  }
  ```
- Manrope в этих компонентах задуман: `npm i @fontsource/manrope` и добавить `@fontsource/manrope/500.css` и `@fontsource/manrope/800.css` в `styles`.

После смены обязательно визуально проверить формы профиля, магазина и диалоги.

Almendra в Fontsource доступна только в латинице, так что русские заголовки, оформленные `'Almendra', 'Alegreya'`, и сейчас фактически набираются Alegreya. Если Almendra нужна только для латинского «Last Hearth», можно оставить одно начертание 700.

### 6.5 Видимый H1 на главной

Сейчас H1 скрыт (`sr-only`) и в нём нет ключевой фразы. В `home.component.html` вместо скрытого H1 сделать видимый блок над каруселью (или в первом слайде):
```html
<header class="px-4 md:px-10 pt-6 flex flex-col gap-2">
    <h1 class="lh-display text-3xl md:text-5xl font-bold text-ink">
        {{ 'home.hero.title' | translate }}
    </h1>
    <p class="text-lg md:text-xl text-ink-2 max-w-3xl">{{ 'home.hero.subtitle' | translate }}</p>
    @if (!isAuthed()) {
        <a routerLink="/start-game" class="lh-cta self-start">{{ 'home.hero.cta' | translate }}</a>
    }
</header>
```

`home.i18n.ts`:
```ts
hero: {
    title: 'Last Hearth — ролевой сервер Vintage Story',
    subtitle: 'Политика, экономика и войны поселений. Без приватов, с честными правилами и собственными модами.',
    cta: 'Начать играть',
},
```

Заголовки слайдов карусели сейчас `<h2>`: это семь одинаково важных заголовков подряд. Лучше сделать их `<p class="…">` с тем же оформлением, а `<h2>` оставить на секциях «Новости», «Пульс сервера», «Команда проекта».

Если welcome-экран останется на главной (раздел 7), его `<h1>Last Hearth</h1>` нужно превратить в `<p>`: двух H1 на странице быть не должно, а welcome при пререндере не рендерится.

---

## 7. Welcome-оверлей только на главной

**Проблема.** `LayoutComponent.showWelcome$` показывает полноэкранное видео с блокировкой прокрутки новому неавторизованному гостю **на любом URL**. Человек из поиска, пришедший на `/rules` или `/faq` с конкретным вопросом, видит вместо ответа заставку. Это повышает отказы, а Google на мобильных считает такие экраны навязчивыми интерстишлами.

**Решение.** Показывать только на `/`.

`layout/layout.component.ts`:
```ts
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { combineLatest, distinctUntilChanged, filter, map, Observable, startWith } from 'rxjs';

private readonly router = inject(Router);

/**
 * Текущая страница — главная.
 * До первой навигации false: оверлей не мелькнёт на внутренних страницах.
 */
private readonly isHomePage$: Observable<boolean> = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => e.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    startWith(false),
    distinctUntilChanged()
);

/**
 * Показывать ли приветственный экран: гость, главная, ещё не видел.
 */
protected readonly showWelcome$: Observable<boolean> = combineLatest([
    inject(UserService).authSettled$,
    this.isHomePage$,
]).pipe(
    map(([isAuth, isHome]) => !isAuth && isHome && !this.isWelcomeSeen),
    distinctUntilChanged()
);
```

Поле `router` должно быть объявлено **выше** `isHomePage$` и `showWelcome$`, иначе при инициализации полей оно будет `undefined`.

Остальное (флаг `lh_welcome_seen`, `updateScrollLock`) без изменений. Если пользователь уходит с главной, не пролистав заставку, `showWelcome$` даёт `false` и подписка в конструкторе снимает блокировку скролла.

Дополнительно, для UX:
- Добавить на welcome видимую кнопку «Пропустить» / «На сайт» (сейчас заставка закрывается колесом мыши, свайпом или кнопкой «Начать играть»).
- Кнопка «Начать играть» на welcome сейчас просто прокручивает к сайту. Лучше вести на `/start-game` и одновременно закрывать заставку: это прямой путь к регистрации.

---

## 8. Производительность

### 8.1 Видео welcome

`public/welcome-video.mp4`: 1280×720, H.264, ~0.93 Мбит/с, 24 с, 2,8 МБ, без звука. На странице к нему применяется CSS-размытие (`blur-xs brightness-80`), поэтому высокое разрешение не нужно. Пробные перекодировки на вашем же файле:

| Вариант | Команда (ключевые параметры) | Размер |
|---|---|---|
| Исходник | — | 2,8 МБ |
| 854 px, CRF 30 | `scale=854:-2` | 1,6 МБ |
| 960 px, лёгкое размытие, CRF 30 | `scale=960:-2,gblur=sigma=2` | **0,98 МБ** |
| 640 px, лёгкое размытие, CRF 32 | `scale=640:-2,gblur=sigma=1.5` | **0,40 МБ** |

Поскольку видео всё равно размывается CSS-ом, рекомендую 640 px (−86 %). Если на больших мониторах будет заметна потеря чёткости, взять 960 px.

```bash
ffmpeg -i public/welcome-video.mp4 -an \
  -vf "scale=640:-2,gblur=sigma=1.5,fps=24" \
  -c:v libx264 -preset slow -crf 32 -pix_fmt yuv420p -movflags +faststart \
  public/welcome-video-640.mp4

# Постер — первый кадр, webp
ffmpeg -i public/welcome-video.mp4 -frames:v 1 -vf "scale=1280:-2" public/welcome-poster.webp
```

`-movflags +faststart` переносит индекс в начало файла: видео начинает играть до полной загрузки. Сейчас постером стоит `/landing-carousel/1.webp`, то есть до загрузки видео показывается другой кадр. Собственный постер (≈90 КБ) убирает этот скачок.

В `welcome.component.html` не включать видео на мобильных и при режиме экономии трафика:
```html
@if (allowVideo) {
    <video #videoPlayer autoplay loop muted playsinline preload="auto" poster="/welcome-poster.webp" …>
        <source src="/welcome-video-640.mp4" type="video/mp4" />
    </video>
} @else {
    <img src="/welcome-poster.webp" alt="" class="size-full object-cover blur-xs brightness-80" />
}
```

`welcome.component.ts`:
```ts
/**
 * Разрешено ли фоновое видео: не на узких экранах и не в режиме экономии трафика.
 */
protected readonly allowVideo: boolean =
    isPlatformBrowser(inject(PLATFORM_ID)) &&
    !window.matchMedia('(max-width: 767px)').matches &&
    !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
```

Логику `tryPlay` / `canplay` / `ViewChild` видео нужно обернуть в проверку `allowVideo`, иначе на мобильных она обратится к несуществующему элементу.

### 8.2 Гидратация и кэш HTTP-ответов из пререндера

Сейчас `provideClientHydration` не подключён. Браузер получает готовый HTML пререндера, а затем Angular **удаляет его и рисует страницу заново**, повторно запрашивая те же данные (новости, поселения). Пользователь видит мигание и скелетоны поверх уже показанного контента, растёт CLS.

`core/config/app.config.ts`:
```ts
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';

providers: [
    provideClientHydration(
        withEventReplay(),
        withHttpTransferCacheOptions({
            // Онлайн и чат должны быть свежими, а не из момента сборки.
            filter: (req) => !/\/serverinfo\/|\/discord\//.test(req.url),
        })
    ),
    // …остальные провайдеры
]
```

С гидратацией Angular переиспользует DOM пререндера, а GET-ответы, полученные при пререндере, встраиваются в HTML и не запрашиваются повторно при старте.

Это самое рискованное изменение в разделе. Гидратация требует, чтобы DOM на сервере и в браузере совпадал. Места, которые отличаются (авторизация, `localStorage`, тема, `Date.now()`, карусель Taiga), дают в консоли ошибки `NG0500`–`NG0507`. Порядок:
1. Включить и пройтись по всем страницам с открытой консолью.
2. Компонентам, которые рендерятся по-разному (вероятно, `app-header` с блоком пользователя, `tui-carousel`, `app-background-particles`), поставить атрибут `ngSkipHydration` в месте использования: `<app-header ngSkipHydration />`. Они будут отрисованы заново, как сейчас, а остальная страница гидратируется.
3. Повторять, пока в консоли не останется ошибок гидратации.

### 8.3 Мелочи

- `features/news/ui/news-card/news-card.component.html`: картинка по умолчанию `/images/screenshots/screen_1.webp` не существует (папки `public/images/screenshots` нет), у новостей без превью фон даёт 404. Заменить на `/landing-carousel/1.webp`.
- Логотип в шапке: `/logo.ico` 96 КБ → `/images/logo-112.webp` 7 КБ (раздел 6.1).
- Проверка результата: Lighthouse (вкладка в Chrome DevTools) в мобильном режиме для `/`, `/rules`, `/settlements`. Ориентиры: LCP < 2,5 с, CLS < 0,1, TBT < 200 мс. Полевые данные появятся в Search Console → «Основные интернет-показатели» через ~28 дней после запуска.

---

## 9. Контент: новости, поселения, рейтинг, посадочные страницы

### 9.1 Страницы новостей `/news` и `/news/:id`

**Проблема.** Новости живут только пагинацией на главной: у карточки нет ни ссылки, ни URL. Это самый свежий и регулярный контент сайта, и он не индексируется, им нельзя поделиться, а публикация в Discord (`create-news.component.ts`) ведёт на `/home`.

Попутно: `NewsApiService.getList()` вызывается без `page_size`, а по контракту по умолчанию отдаётся 15 записей. Сейчас в API 16 новостей, так что самая старая на сайте уже не видна.

#### API

`entities/news/api/news.api.ts`, метод `getList`:
```ts
/**
 * Список новостей (до 50 последних).
 */
getList(pageSize = 50): Observable<NewsDto[]> {
    return this.http
        .get<{ news: NewsDto[] }>(`${this.baseUrl}/news`, {
            params: { page_size: pageSize },
            context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        })
        .pipe(map((response) => response.news));
}
```

Бэкенду: перестать увеличивать `view_count` в `GET /news/{id}` (для учёта просмотров уже есть `POST /news/{id}/views`), иначе каждый пререндер и каждый заход поискового робота накручивает счётчик. До этой правки на сервере новость берётся из списка (см. ниже).

#### Роуты

`routes/enums/route-keys.ts`: добавить `news = 17`, `leaderboard = 18`.

`routes/app.routes.ts` (перед `'**'`):
```ts
{
    path: 'news',
    loadComponent: () =>
        loadPage(
            () => import('../features/news/ui/news-list-page/news-list-page.component').then((m) => m.NewsListPageComponent),
            [() => import('@core/i18n/translations/features/news.i18n').then((m) => m.NEWS_I18N)]
        ),
    data: { route_keys: RouteKeys.news, seo: routeSeoData.news },
},
{
    path: 'news/:id',
    loadComponent: () =>
        loadPage(
            () => import('../features/news/ui/news-page/news-page.component').then((m) => m.NewsPageComponent),
            [() => import('@core/i18n/translations/features/news.i18n').then((m) => m.NEWS_I18N)]
        ),
    data: { route_keys: RouteKeys.news, seo: routeSeoData.news },
},
```

`routes/seo-data.ts`:
```ts
news: {
    title: 'Новости сервера Last Hearth',
    description: 'Новости ролевого сервера Last Hearth: обновления, события, вайпы, изменения правил и жизнь поселений Vintage Story.',
    url: `${siteUrl}/news`,
    type: 'website',
    breadcrumb: 'Новости',
},
```

#### Состояние страницы

`features/news/model/news-page-state.ts`:
```ts
import { News } from '@entities/news';

/**
 * Состояние страницы новости.
 */
export type NewsPageState =
    | { status: 'loading' }
    | { status: 'ready'; news: News }
    | { status: 'not-found' };
```

#### Компонент страницы новости

`features/news/ui/news-page/news-page.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap, tap, throwError } from 'rxjs';
import { mapDtoToNews, News, NewsApiService, NewsDto } from '@entities/news';
import { SeoService } from '@core/services/seo.service';
import { JsonLdService } from '@core/services/json-ld.service';
import { buildBreadcrumbs } from '@core/lib/build-breadcrumbs.function';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { NewsSkeletonComponent } from '../news-skeleton/news-skeleton.component';
import { NewsPageState } from '../../model/news-page-state';

/**
 * Страница отдельной новости: /news/:id.
 */
@Component({
    standalone: true,
    selector: 'app-news-page',
    imports: [RouterLink, ImageLoaderComponent, NewsSkeletonComponent],
    templateUrl: './news-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly api = inject(NewsApiService);
    private readonly seo = inject(SeoService);
    private readonly jsonLd = inject(JsonLdService);
    private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

    /**
     * Состояние страницы.
     */
    protected readonly state = toSignal(
        this.route.paramMap.pipe(
            map((params) => params.get('id') ?? ''),
            switchMap((id) =>
                this.load(id).pipe(
                    map((dto): NewsPageState => ({ status: 'ready', news: mapDtoToNews(dto) })),
                    catchError(() => of<NewsPageState>({ status: 'not-found' })),
                    startWith<NewsPageState>({ status: 'loading' })
                )
            ),
            tap((state) => this.applySeo(state))
        ),
        { initialValue: { status: 'loading' } as NewsPageState }
    );

    public constructor() {
        inject(DestroyRef).onDestroy(() => this.jsonLd.set('page', null));
    }

    /**
     * Загружает новость. На сервере берёт её из списка,
     * чтобы пререндер не увеличивал счётчик просмотров.
     *
     * @param id Идентификатор новости.
     */
    private load(id: string): Observable<NewsDto> {
        if (!this.isServer) {
            return this.api.getById(id);
        }

        return this.api.getList().pipe(
            switchMap((list) => {
                const found = list.find((item) => item.id === id);
                return found ? of(found) : throwError(() => new Error('not found'));
            })
        );
    }

    /**
     * Выставляет SEO-теги и JSON-LD по состоянию.
     *
     * @param state Состояние страницы.
     */
    private applySeo(state: NewsPageState): void {
        if (state.status === 'not-found') {
            this.seo.setSeoTags({
                title: 'Новость не найдена — Last Hearth',
                description: 'Новость удалена или ещё не опубликована.',
                robots: 'noindex, follow',
            });
            return;
        }

        if (state.status !== 'ready') {
            return;
        }

        const { news } = state;
        const url = `https://lasthearth.ru/news/${news.id}`;
        const text = news.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const description = text.length > 160 ? `${text.slice(0, 157)}...` : text;
        const published = news.createdAt?.toISOString();

        this.seo.setSeoTags({
            title: `${news.title} — новости Last Hearth`,
            description,
            url,
            type: 'article',
            image: news.preview || undefined,
            imageAlt: news.title,
            publishedTime: published,
        });

        this.jsonLd.set('page', {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: news.title,
            description,
            image: news.preview ? [news.preview] : undefined,
            datePublished: published,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: 'Last Hearth', url: 'https://lasthearth.ru/' },
            publisher: { '@id': 'https://lasthearth.ru/#org' },
        });

        this.jsonLd.set(
            'breadcrumbs',
            buildBreadcrumbs([
                { name: 'Last Hearth', url: 'https://lasthearth.ru/' },
                { name: 'Новости', url: 'https://lasthearth.ru/news' },
                { name: news.title, url },
            ])
        );
    }
}
```

Вызов `setSeoTags` для not-found с тремя полями проходит типизацию, потому что после 5.2 в `ISeoData` обязательны только `title` и `description`.

В компонент добавить вычисляемое поле, чтобы в шаблоне не обходить типизацию:
```ts
/**
 * Загруженная новость или null.
 */
protected readonly news = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.news : null;
});
```

`features/news/ui/news-page/news-page.component.html`:
```html
@if (news(); as item) {
    <article class="p-6 flex flex-col gap-6">
        <nav aria-label="Навигация" class="text-ink-2">
            <a routerLink="/">Главная</a> / <a routerLink="/news">Новости</a>
        </nav>
        <h1 class="lh-display text-3xl md:text-5xl font-bold text-ink">{{ item.title }}</h1>
        <time class="text-ink-2" [attr.datetime]="item.createdAt?.toISOString()">{{ item.formattedDate }}</time>
        @if (item.preview) {
            <app-image-loader
                [src]="item.preview"
                [alt]="item.title"
                [eager]="true"
                class="w-full max-h-[480px] rounded-xl overflow-hidden"
            />
        }
        <div class="text-lg leading-8 text-ink" [innerHTML]="item.content"></div>
        <a routerLink="/news" class="lh-cta self-start">Все новости</a>
    </article>
} @else if (state().status === 'not-found') {
    <div class="p-6 flex flex-col gap-4">
        <h1 class="lh-display text-3xl font-bold text-ink">Новость не найдена</h1>
        <a routerLink="/news" class="lh-cta self-start">Все новости</a>
    </div>
} @else {
    <app-news-skeleton class="!h-auto w-full" />
}
```
Тексты шаблона («Новость не найдена», «Все новости», «Главная») вынести в `news.i18n.ts` и добавить `TranslatePipe` в `imports`.

Компонент и шаблон проверены компилятором Angular 20.3 со `strictTemplates` (на заглушках зависимостей).

`NewsListPageComponent` (`/news`) — список всех новостей (`getList()`), каждая карточка ведёт на `/news/:id`. В заголовке `<h1>Новости Last Hearth</h1>`.

#### Карточка новости и главная

В `news-card.component.html` заголовок карточки сделать ссылкой:
```html
<h2 class="…">
    <a [routerLink]="['/news', id()]" class="news-card__link">{{ title() }}</a>
</h2>
```
Чтобы кликабельной была вся карточка, а не только заголовок, растянуть ссылку псевдоэлементом (кнопка удаления у админа должна быть выше по `z-index`):
```less
.news-card__link::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 10;
}
```
Добавить `RouterLink` в `imports` карточки.

На главной под блоком новостей — ссылка `<a routerLink="/news">Все новости</a>`.

В `create-news.component.ts` ссылку для Discord строить по `id` созданной новости:
```ts
const newsUrl = `${window.location.origin}/news/${created.id}`;
```
(где `created` — ответ `POST /news`).

#### RSS

`public/rss.xml` генерируется скриптом из раздела 4.1 при `INCLUDE_NEWS_PAGES = true`. Ссылка на него — в `<head>` (раздел 6.3). RSS нужен для автопостинга: Telegram-боты (например, через IFTTT/Zapier или собственный бот), Discord-ботов и агрегаторов.

#### Включение

1. `INCLUDE_NEWS_PAGES = true` и раскомментировать `/news` в `generate-routes.mjs`.
2. Ссылка «Новости» в шапке и подвале.
3. Пересборка по публикации новости (раздел 4.3).

### 9.2 Публичные страницы поселений `/settlements/:id`

`GET /settlements/{id}` публичный, страница строится по той же схеме, что 9.1:

- Роут `settlements/:id` → `SettlementPageComponent` (`features/settlements/settlement-page/`).
- Данные: `SettlementService.getSettlementById(id)` + жители через `UserService.getPlayersBatch$(memberIds)`.
- Разметка: `<h1>` с названием и типом (Город, Деревня, Хутор…), описание, дипломатический курс, глава, список жителей, теги, вложения-скриншоты (`attachments`), дата основания (`created_at`).
- Для отображения можно переиспользовать `<app-settlement-card [data]="settlement" [players]="players" />`.
- SEO: `title: '<Название> — <тип> на сервере Last Hearth'`, `description` из `description` поселения (первые 160 символов), `image` — первое вложение.
- JSON-LD: `BreadcrumbList` (Главная → Поселения → название). Отдельный тип schema.org для игрового поселения не подходит, поэтому больше ничего не нужно.
- На `/settlements` каждая карточка ведёт ссылкой `<a [routerLink]="['/settlements', s.id]">` на свою страницу.
- `INCLUDE_SETTLEMENT_PAGES = true` в `generate-routes.mjs`.

**Внимание к приватности:** публичный API `/settlements` уже отдаёт `coordinates` каждого поселения. Если на PvP-сервере координаты не должны быть видны всем, их не стоит выводить на публичной странице, а бэкенду стоит отдавать их только членам поселения и администрации.

### 9.3 Публичный рейтинг `/leaderboard`

Рейтинг сейчас доступен только в `/profile/stats` (за авторизацией), хотя `GET /leaderboard?filter=&limit=` и `GET /hungergames/leaderboard` публичные.

- Роут `leaderboard` → `LeaderboardPageComponent`: вкладки «Онлайн», «Убийства», «Смерти» (тот же `filter`, что в статистике) и «Голодные игры» (текущий сезон + архив через `/hungergames/seasons`).
- Переиспользовать `features/profile/statistics/leader-card`. Чтобы не нарушать правило слоёв FSD, `leader-card` перенести в `entities/user/ui/` или `widgets/`.
- SEO: `title: 'Рейтинг игроков Last Hearth'`, `breadcrumb: 'Рейтинг'`.
- Ссылка в шапке («Рейтинг») и на главной под «Пульсом сервера».
- Раскомментировать `/leaderboard` в `generate-routes.mjs`.

### 9.4 Профили игроков `/player/:nick` (позже)

Для статуса и для того, чтобы игроки делились ссылками на свой профиль. Данные: `GET /{name}/stats` (публичный, по контракту) + `GET /users/search?query=` для аватара и поселения. Страниц много и они быстро меняются, поэтому их не пререндерить, а отдавать CSR-оболочку (`location ^~ /player/ { try_files /index.csr.html =404; }`) с `robots: 'noindex, follow'` до тех пор, пока на профиле не появится содержательный контент (достижения, история поселений).

### 9.5 Посадочные страницы под небрендовые запросы

Брендовый запрос «Last Hearth» конкурирует с локацией из «Игры престолов» и игрой *The Last Hearth Defense*, поэтому нужны страницы под то, что ищет целевой игрок:

| Страница | Запросы | Содержание |
|---|---|---|
| `/start-game` (расширить) | «как играть в Vintage Story по сети», «как зайти на сервер Vintage Story» | Сейчас ~600 символов. Нужно: требования и версия игры (`environment.gameVersion`), где купить/скачать, как добавить сервер (со скриншотами), как пройти верификацию, типичные ошибки подключения (неверная версия, моды, пароль), ссылки на FAQ и Discord |
| `/mods` (новая) | «моды сервера Vintage Story», «какие моды нужны для Last Hearth» | Список модов сервера с описанием и ссылками на ModDB, версия каждого, как установить. Обновляется при изменении сборки |
| `/about` или блок на главной | «ролевой сервер Vintage Story», «Vintage Story RP сервер», «сервер с поселениями» | 1500–2500 знаков живого текста: концепция, система поселений (7 уровней), войны и набеги, дипломатия, экономика, чем отличается от других серверов. Текст из первого ответа FAQ — хорошая основа |
| `/guides/*` или перелинковка с docs.lasthearth.ru | «гайд Vintage Story для новичков», «первая неделя Vintage Story» | Если гайды живут на docs.lasthearth.ru, ставить на них ссылки с `/start-game` и `/faq` и обратно; самые сильные 2–3 гайда стоит держать на основном домене |

Каждую новую страницу — в `generate-routes.mjs` (`STATIC_ROUTES`), в `seo-data.ts`, в подвал.

### 9.6 Описание магазина

`routes/seo-data.ts` → `market.description` сейчас: «…Пополняйте баланс осколков и покупайте **преимущества**». Это видно в сниппете поисковика и превью в мессенджерах и для сервера с «честными правилами» читается как pay-to-win. Вариант:
```ts
description:
    'Магазин Last Hearth: косметические наборы, титулы и особые предметы. Покупки поддерживают развитие сервера и не дают преимуществ в PvP.',
```
Последнее предложение — только если это правда. Если в магазине есть вещи, влияющие на баланс, лучше честно перечислить, что именно продаётся.

---

## 10. Внешнее присутствие

### 10.1 Яндекс.Вебмастер и Google Search Console

1. **Яндекс.Вебмастер** (webmaster.yandex.ru) → «Добавить сайт» → `https://lasthearth.ru` → подтвердить мета-тегом `yandex-verification` (вставить значение в `index.html`, раздел 6.3) или DNS-записью.
2. **Google Search Console** (search.google.com/search-console) → ресурс «Доменный» `lasthearth.ru` → подтверждение TXT-записью в DNS (покрывает все поддомены, включая docs.lasthearth.ru). Или ресурс «Префикс URL» с мета-тегом.
3. В обоих: отправить `https://lasthearth.ru/sitemap.xml`.
4. После деплоя разделов 2–4 проверить отчёты:
   - Яндекс: «Индексирование → Страницы в поиске», «Диагностика», «Переезд сайта» (не нужен), «Регион сайта» (указать Россию или «без региона», если аудитория шире).
   - Google: «Индексирование страниц» — причины «Страница с переадресацией», «Копия, Google выбрал другую каноническую страницу», «Ложная ошибка 404» должны сойти на нет в течение 2–4 недель.
5. В Вебмастере: «Представление в поиске → Быстрые ссылки» и «Фавикон» — проверить, что подхватилась новая иконка.

### 10.2 IndexNow: мгновенное уведомление поисковиков

Яндекс и Bing поддерживают протокол IndexNow: после публикации новости можно сразу сообщить URL, не дожидаясь обхода. Google его не поддерживает.

1. Сгенерировать ключ (любая строка 32+ hex-символов) и положить файл `public/<ключ>.txt` с этим же ключом внутри.
2. После деплоя (шаг в CI или в бэкенде при публикации новости):
```bash
curl -s -X POST "https://yandex.com/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "lasthearth.ru",
    "key": "<ключ>",
    "keyLocation": "https://lasthearth.ru/<ключ>.txt",
    "urlList": ["https://lasthearth.ru/news/<id>", "https://lasthearth.ru/news"]
  }'
```
Ответ 200 или 202 означает, что запрос принят.

### 10.3 Мониторинги и каталоги серверов

Проверить, что сервер есть в каждом, с единым описанием и ссылкой на сайт с UTM-меткой (чтобы в Метрике видеть, откуда пришли игроки):

| Площадка | Ссылка на сайт |
|---|---|
| servers.vintagestory.at (официальный список) | `https://lasthearth.ru/?utm_source=vs_serverlist` |
| playbase.pro/ru/vintage-story | `?utm_source=playbase` |
| Мониторинг FPlay (fplay.su) | `?utm_source=fplay` |
| disboard.org / disdex.io (Discord-каталоги) | `?utm_source=disboard` |
| Форум Vintage Story, раздел Multiplayer → Servers | `?utm_source=vs_forum` |

Единое описание (шаблон, ~300 знаков):
> Last Hearth — русскоязычный ролевой политико-экономический сервер Vintage Story. 7 уровней поселений от хутора до сюзерена, дипломатия, набеги и войны по правилам, без приватов. Собственные моды, активная администрация, сезоны. Сайт: lasthearth.ru

`/start-game` ссылается на бесплатную версию игры от FPlay, значит, аудитория FPlay — вероятно, заметный источник игроков. Это стоит подтвердить ответами на вопрос «Как вы узнали о нас?» в анкете (раздел 11.4).

### 10.4 Видео и соцсети

- RuTube: видео «Vintage Story. Last Hearth» уже находится в поиске по брендовому запросу. В описании каждого ролика (RuTube и YouTube) первой строкой ставить ссылку `https://lasthearth.ru/start-game?utm_source=youtube` (или `rutube`).
- `/videos`: каждое видео разметить `VideoObject` (название, превью, дата, `embedUrl`). Данные уже есть в `YoutubeService`.
- Официальный Telegram-канал (если его нет — завести) с автопостингом из RSS (раздел 9.1) и ссылкой в `sameAs`.

---

## 11. Аналитика и согласие на cookies

### 11.1 Что сейчас

В `index.html` безусловно грузится Microsoft Clarity (запись сессий, cookies, передача данных в Microsoft). Баннера согласия нет. Целей и событий нет: невозможно понять, сколько посетителей доходят до анкеты, до одобрения и до первого входа в игру.

Я не юрист. По 152-ФЗ cookies и запись сессий, которые позволяют идентифицировать пользователя, обычно считаются обработкой персональных данных, а передача данных зарубежному сервису (Clarity) — трансграничной передачей. Поэтому ниже аналитика подключается только после согласия, а политику конфиденциальности (`/privacy-policy`) нужно дополнить перечнем используемых сервисов. Окончательные формулировки стоит согласовать со специалистом.

### 11.2 Сервис согласия

`core/services/consent.service.ts`:
```ts
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from '@core/services/local-storage.service';

/**
 * Хранит решение пользователя об аналитических cookies.
 * null — пользователь ещё не ответил.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
    private static readonly STORAGE_KEY = 'lh-analytics-consent';

    private readonly storage = inject(LocalStorageService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Текущее решение: true — разрешено, false — отказ, null — не спрашивали.
     */
    public readonly analytics = signal<boolean | null>(
        this.isBrowser ? (this.storage.getItem<boolean>(ConsentService.STORAGE_KEY) ?? null) : null
    );

    /**
     * Сохраняет решение пользователя.
     *
     * @param allowed Разрешена ли аналитика.
     */
    public setAnalytics(allowed: boolean): void {
        this.storage.setItem(ConsentService.STORAGE_KEY, allowed);
        this.analytics.set(allowed);
    }
}
```

Баннер `shared/ui/consent-banner/` — плашка внизу экрана, показывается при `analytics() === null`: «Мы используем cookies для статистики посещений. [Подробнее](/privacy-policy)» и две **равнозначные** кнопки «Разрешить» и «Только необходимые». Подключить в `layout.component.html` внутри `@defer (on idle)`, чтобы не влиять на первый экран. Изменить решение — ссылка «Настройки cookies» в подвале, которая сбрасывает `analytics` в `null`.

### 11.3 AnalyticsService: Метрика + Clarity после согласия

`core/services/analytics.service.ts`:
```ts
import { DOCUMENT, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ConsentService } from '@core/services/consent.service';
import { AnalyticsGoal } from '@core/types/analytics-goal';

/** Номер счётчика Яндекс.Метрики. */
const METRIKA_ID = 0; // ЗАМЕНИТЬ

/** Идентификатор проекта Clarity. */
const CLARITY_ID = 'u3k2hyqs0a';

type Ym = (id: number, method: string, ...args: unknown[]) => void;

/**
 * Подключает счётчики после согласия и отправляет цели.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    private readonly consent = inject(ConsentService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private loaded = false;

    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        effect(() => {
            if (this.consent.analytics() === true && !this.loaded) {
                this.loaded = true;
                this.loadMetrika();
                this.loadClarity();
            }
        });

        // SPA: Метрика сама не видит смену URL при init с defer: true.
        this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe((e) => this.ym()?.(METRIKA_ID, 'hit', e.urlAfterRedirects, { title: this.document.title }));
    }

    /**
     * Отправляет достижение цели.
     *
     * @param goal Идентификатор цели (совпадает с настроенным в Метрике).
     * @param params Дополнительные параметры визита.
     */
    public goal(goal: AnalyticsGoal, params?: Record<string, string | number>): void {
        this.ym()?.(METRIKA_ID, 'reachGoal', goal, params);
    }

    /**
     * Функция Метрики, если счётчик загружен.
     */
    private ym(): Ym | undefined {
        return this.loaded ? (window as unknown as { ym?: Ym }).ym : undefined;
    }

    /**
     * Вставляет счётчик Метрики (официальный сниппет, без <noscript>).
     */
    private loadMetrika(): void {
        const w = window as unknown as { ym?: Ym & { a?: unknown[]; l?: number } };
        w.ym =
            w.ym ??
            Object.assign((...args: unknown[]) => (w.ym!.a = w.ym!.a ?? []).push(args), { l: Date.now() });
        this.appendScript('https://mc.yandex.ru/metrika/tag.js');
        w.ym!(METRIKA_ID, 'init', {
            defer: true,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: false, // запись сессий уже делает Clarity; если оставить одну, выбрать Вебвизор
        });
        // Если согласие дали уже на открытой странице, засчитать её вручную;
        // до первой навигации хит отправит подписка на NavigationEnd.
        if (this.router.navigated) {
            w.ym!(METRIKA_ID, 'hit', this.router.url, { title: this.document.title });
        }
    }

    /**
     * Вставляет Clarity.
     */
    private loadClarity(): void {
        const w = window as unknown as { clarity?: ((...args: unknown[]) => void) & { q?: unknown[] } };
        w.clarity = w.clarity ?? Object.assign((...args: unknown[]) => (w.clarity!.q = w.clarity!.q ?? []).push(args), {});
        this.appendScript(`https://www.clarity.ms/tag/${CLARITY_ID}`);
    }

    /**
     * Добавляет async-скрипт в <head>.
     *
     * @param src Адрес скрипта.
     */
    private appendScript(src: string): void {
        const script = this.document.createElement('script');
        script.async = true;
        script.src = src;
        this.document.head.appendChild(script);
    }
}
```

`core/types/analytics-goal.ts`:
```ts
/**
 * Цели воронки. Те же идентификаторы создать в Метрике: «Цели» → «JavaScript-событие».
 */
export type AnalyticsGoal =
    | 'cta_start_game'
    | 'sign_up_click'
    | 'verification_open'
    | 'verification_submit'
    | 'server_ip_copy'
    | 'discord_click'
    | 'referral_copy'
    | 'market_open_item'
    | 'purchase_start';
```

Подключение: в `AppComponent` добавить `inject(AnalyticsService);` (чтобы сервис создался при старте), а из `index.html` удалить скрипт Clarity.

Где вызывать `goal()`:

| Цель | Место |
|---|---|
| `cta_start_game` | кнопки «Начать играть» (welcome, главная, шапка) |
| `sign_up_click` | `signIn()` в `start-game.component.ts` и в шапке |
| `verification_open` / `verification_submit` | `player-verification-form` (открытие диалога / успешная отправка) |
| `server_ip_copy` | `how-play.component.ts`, метод `copy()` — лучший доступный на фронте признак «собирается зайти в игру» |
| `discord_click` | ссылки на Discord (главная, подвал) |
| `referral_copy` | `referral-widget` |
| `market_open_item` / `purchase_start` | `market` / `purchase-dialog` |

В Метрике создать составную цель «Воронка новичка»: `cta_start_game` → `sign_up_click` → `verification_submit` → `server_ip_copy`.

### 11.4 Удержание считается на бэкенде

События после анкеты (одобрение, первый вход на сервер, наигранные часы) видит только бэкенд и игровой сервер, поэтому когорты удержания строить там.

Минимальная таблица событий в vsservice:
```sql
CREATE TABLE player_events (
    user_id     TEXT        NOT NULL,
    event       TEXT        NOT NULL, -- signed_up | verification_submitted | verification_approved
                                      -- | verification_rejected | first_join | session_day | settlement_joined
    source      TEXT,                 -- ответ на «Как вы узнали о нас?» из анкеты
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON player_events (event, created_at);
CREATE INDEX ON player_events (user_id);
```

`session_day` — одна запись на игрока за календарный день, когда он был онлайн (игровой сервер уже знает `hours_played` и `last_online`).

Удержание D1/D7/D30 по источнику (PostgreSQL):
```sql
WITH cohort AS (
    SELECT user_id, source, date_trunc('week', created_at) AS week, created_at AS joined_at
    FROM player_events
    WHERE event = 'first_join'
)
SELECT
    c.week,
    c.source,
    count(*) AS players,
    round(100.0 * count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM player_events e WHERE e.user_id = c.user_id AND e.event = 'session_day'
          AND e.created_at::date = c.joined_at::date + 1)) / count(*), 1) AS d1,
    round(100.0 * count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM player_events e WHERE e.user_id = c.user_id AND e.event = 'session_day'
          AND e.created_at::date BETWEEN c.joined_at::date + 7 AND c.joined_at::date + 13)) / count(*), 1) AS d7,
    round(100.0 * count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM player_events e WHERE e.user_id = c.user_id AND e.event = 'session_day'
          AND e.created_at::date BETWEEN c.joined_at::date + 30 AND c.joined_at::date + 36)) / count(*), 1) AS d30
FROM cohort c
GROUP BY c.week, c.source
ORDER BY c.week DESC, players DESC;
```

D7 и D30 здесь считаются «вернулся хотя бы раз в течение недели после 7-го/30-го дня», что для игрового сервера с нерегулярными сессиями нагляднее, чем строго «был онлайн ровно на 7-й день».

Конверсии воронки (сколько от `signed_up` дошли до `verification_approved` и `first_join`, и медианное время между шагами) считаются той же таблицей. Медиана времени проверки анкеты нужна и для раздела 12.2.

---

## 12. Удержание: онбординг и верификация

Путь новичка сейчас: установить игру → аккаунт Logto → прочитать правила → анкета → **ждать ручной проверки** → IP и пароль в профиле. Узкое место — ожидание: игрок не знает, сколько ждать, и не узнаёт об одобрении, пока сам не зайдёт на сайт.

### 12.1 Уведомления о решении по анкете

**Бэкенд (vsservice).** При `POST /verification/{user_id}/approve` и `…/reject`:
1. Создать запись в уже существующем `NotificationService` (`/v1/notifications`): заголовок «Анкета одобрена» / «Анкета отклонена», текст с причиной отказа.
2. Отправить письмо: email игрока есть в Logto (scope `email` уже запрашивается). Шаблон одобрения: «Ваша анкета на Last Hearth одобрена. IP и пароль — в профиле: https://lasthearth.ru/profile/how-play».
3. Если у игрока привязан Discord (12.5) — личное сообщение от бота. Если ЛС закрыты (Discord вернёт ошибку 50007), упомянуть игрока в служебном канале `#верификация`.
4. Записать событие `verification_approved` / `verification_rejected` (раздел 11.4).

Отправка личного сообщения ботом Discord (HTTP API v10, псевдокод на Go):
```go
// 1. Открыть DM-канал
ch, err := discord.Post("/users/@me/channels", map[string]string{"recipient_id": discordUserID})
// 2. Отправить сообщение
_, err = discord.Post("/channels/"+ch.ID+"/messages", map[string]any{
    "content": "Твоя анкета на Last Hearth одобрена! IP и пароль: https://lasthearth.ru/profile/how-play",
})
// err с кодом 50007 → ЛС закрыты, упомянуть <@discordUserID> в канале #верификация
```

**Фронтенд.** API уведомлений описан в `API_CONTRACT.md` (2.6), но на фронте не реализован.

`entities/notification/model/app-notification.ts`:
```ts
/**
 * Уведомление пользователя.
 */
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}
```

`entities/notification/model/notification-dto.ts`:
```ts
/**
 * DTO уведомления из `/notifications`.
 */
export interface NotificationDto {
    id: string;
    user_id: string;
    title: string;
    message: string;
    state: number;
    created_at: string;
}
```

`entities/notification/api/notification.api.ts`:
```ts
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { AppNotification } from '../model/app-notification';
import { NotificationDto } from '../model/notification-dto';

/** Значение `state` для прочитанного уведомления. Сверить с enum в openapi.yaml. */
const STATE_READ = 2;

/**
 * API уведомлений пользователя.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    /**
     * Последние уведомления (новые сверху).
     */
    public list(): Observable<AppNotification[]> {
        return this.http
            .get<{ notifications: NotificationDto[] }>(`${this.baseUrl}/notifications`, {
                params: { page_size: 15, order_by: 'created_at desc' },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map((res) =>
                    (res.notifications ?? []).map((dto) => ({
                        id: dto.id,
                        title: dto.title,
                        message: dto.message,
                        isRead: dto.state === STATE_READ,
                        createdAt: new Date(dto.created_at),
                    }))
                )
            );
    }

    /**
     * Отмечает уведомление прочитанным.
     *
     * @param id Идентификатор уведомления.
     */
    public markAsRead(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/notifications/${id}:markAsRead`, {});
    }
}
```

`entities/notification/model/notification.store.ts` — опрос раз в минуту, только для авторизованных и только когда вкладка видна:
```ts
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY, fromEvent, map, of, startWith, switchMap, timer } from 'rxjs';
import { UserService } from '@entities/user';
import { NotificationApi } from '../api/notification.api';
import { AppNotification } from './app-notification';

/**
 * Хранилище уведомлений с периодическим опросом.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
    private readonly api = inject(NotificationApi);

    /** Последние уведомления. */
    public readonly items = signal<AppNotification[]>([]);

    /** Число непрочитанных. */
    public readonly unread = computed(() => this.items().filter((n) => !n.isRead).length);

    public constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }

        const visible$ = fromEvent(document, 'visibilitychange').pipe(
            startWith(null),
            map(() => document.visibilityState === 'visible')
        );

        inject(UserService)
            .authState$.pipe(
                switchMap((isAuth) => (isAuth ? visible$ : of(false))),
                switchMap((active) => (active ? timer(0, 60_000) : EMPTY)),
                switchMap(() => this.api.list())
            )
            .subscribe((items) => this.items.set(items));
    }

    /**
     * Отмечает уведомление прочитанным (оптимистично).
     *
     * @param id Идентификатор.
     */
    public markAsRead(id: string): void {
        this.items.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        this.api.markAsRead(id).subscribe();
    }
}
```

В шапке рядом с аватаром — колокольчик с бейджем `unread()` и выпадающим списком (`tui-dropdown`). Плюс счётчик в заголовке вкладки: в `AppComponent`
```ts
private readonly notifications = inject(NotificationStore);
private readonly document = inject(DOCUMENT);

// в конструкторе:
effect(() => {
    const count = this.notifications.unread();
    const base = this.document.title.replace(/^\(\d+\)\s/, '');
    this.document.title = count ? `(${count}) ${base}` : base;
});
```
Учтите, что `SeoService` при каждой навигации перезаписывает title без счётчика; чтобы счётчик не пропадал, эффект стоит дополнительно перезапускать на `NavigationEnd` (например, держать номер навигации в сигнале и читать его внутри `effect`).

Текущий `core/services/notification.service.ts` (приглашения, заявки на верификацию для админов) можно оставить как есть и со временем перевести эти события на тот же `/notifications`.

### 12.2 Статус анкеты и ожидаемый срок

В профиле (`profile.component.html`, блок `details?.status === "pending"`) вместо одной строки показать шаги:

```
✓ Анкета отправлена — 5 окт., 14:20
● На проверке — обычно проверяем за ~6 ч
○ Одобрено — придёт письмо и уведомление на сайте
```

«Обычно проверяем за N ч»: медиана времени проверки за последние 30 дней из таблицы событий (11.4). Бэкенду — публичный эндпоинт:
```
GET /v1/verification/stats → { "median_review_hours": 6, "pending_count": 3 }
```
Пока эндпоинта нет — текст в i18n с честной оценкой.

Для администрации: в `admin`-панели показывать число ожидающих анкет и возраст самой старой; бэкенду — уведомление модераторам в Discord, если анкета ждёт дольше заданного порога (например, 12 ч). Время проверки напрямую влияет на то, сколько людей вообще доходят до игры.

### 12.3 Экран ожидания: что сделать сейчас

Пока анкета на проверке, под статусом — короткий чек-лист (ссылки, без отслеживания):
1. Скачать игру версии `{{ environment.gameVersion }}` (ссылка на официальный сайт и на `/start-game`).
2. Установить моды сервера (`/mods`, раздел 9.5).
3. Вступить в Discord (ссылка с UTM `?utm_source=site_pending`).
4. Выбрать поселение, которое набирает жителей (`/settlements?recruiting=1`, раздел 13.2).
5. Прочитать ключевые разделы правил: набеги, воровство, территории (якорные ссылки на `/rules#…`).

Цель — чтобы к моменту одобрения игрок был готов зайти сразу.

### 12.4 Отказ

Повторная подача после отказа уже работает (кнопка показывается при `status == "rejected"`). Улучшения:
- форма открывается с уже заполненными полями прошлой анкеты (`GET /verification/details`);
- причина отказа показывается прямо в форме над полем, к которому она относится (если бэкенд будет отдавать поле, например `rejected_field: "game_name"`).

### 12.5 Привязка Discord через Logto

Сейчас в анкете поле «Ваш discord или telegram» — свободный текст, по нему бот не может написать игроку.

1. В Logto Console → Connectors → Social → добавить **Discord** (нужно приложение в Discord Developer Portal, redirect URI из Logto).
2. В Sign-in experience разрешить вход через Discord и привязку к существующему аккаунту.
3. В профиле сайта — кнопка «Привязать Discord». Бэкенд получает Discord ID из Logto Management API: `GET /api/users/{userId}` → `identities.discord.userId`.
4. С привязанным Discord: ЛС от бота (12.1, 13.6), автоматическая выдача ролей на Discord-сервере (житель поселения, верифицирован), а поле в анкете заполняется автоматически.

### 12.6 Пароль и IP после одобрения

См. раздел 1: данные подключения приходят с бэкенда только верифицированным. На странице `how-play` после одобрения — крупная кнопка «Скопировать IP» (цель `server_ip_copy`), пошаговая инструкция «Мультиплеер → Добавить сервер» со скриншотом и ссылка «Найти поселение».

---

## 13. Удержание: первая неделя и поводы возвращаться

Ниже — спецификации. Каждая фича описана так, чтобы её можно было взять в работу: данные, API, UI, метрика успеха.

### 13.1 «Первые шаги»: чек-лист новичка

**Зачем.** Первая неделя решает, останется ли игрок. Чек-лист даёт понятные цели и маленькую награду.

**Шаги** (конфиг на бэкенде, чтобы менять без релиза фронта):

| Ключ | Шаг | Как засчитывается | Награда |
|---|---|---|---|
| `verified` | Пройти верификацию | автоматически | — |
| `first_join` | Зайти на сервер | первое событие `first_join` | 5 осколков |
| `discord_linked` | Привязать Discord | 12.5 | 5 |
| `hours_5` | Наиграть 5 часов | `hours_played >= 5` | 10 |
| `settlement` | Вступить в поселение или основать хутор | членство в поселении | 15 |
| `rules_quiz` | Ответить на 3 вопроса по правилам | уже есть `rule-question` API | 5 |
| `event` | Поучаствовать в событии | отметка организатором / Голодные игры | 10 |

**API (новое):**
```
GET  /v1/onboarding           → { steps: [{ key, done, done_at, reward }], completed_at }
POST /v1/onboarding/claim     → начисляет осколки за выполненные шаги (через существующий DonateService)
```
Шаги проверяются на бэкенде из уже имеющихся данных (статистика игрока, членство в поселении, верификация), фронт ничего не «отмечает» сам.

**UI.** Карточка «Первые шаги» в профиле сверху (пока не выполнены все шаги или не прошло 14 дней) с прогресс-баром и кнопкой «Забрать награду».

**Метрика:** доля новичков, выполнивших `settlement` за 7 дней; D7 у выполнивших против остальных.

### 13.2 Набор в поселения

**Зачем.** Одиночки, не нашедшие группу, уходят первыми. Заявки на вступление уже реализованы, не хватает витрины «кто набирает».

**Данные.** В `Settlement` добавить:
```ts
recruiting: boolean;          // набор открыт
recruiting_note?: string;     // «Ищем кузнеца и пару бойцов, онлайн по вечерам МСК» (≤ 280 символов)
```
`PATCH /settlements/{id}` (владелец) — по аналогии с `contact-info`.

**UI.**
- В редактировании поселения — переключатель «Набор открыт» и поле заметки.
- На `/settlements` — фильтр «Набирают жителей» (`?recruiting=1`), бейдж «Набор открыт» на карточке, заметка и кнопка «Подать заявку» (`join-request-button` уже есть).
- Блок «Поселения ищут жителей» (3 карточки) на экране ожидания верификации (12.3), на `how-play` и в «Первых шагах».

**Метрика:** время от `first_join` до вступления в поселение.

### 13.3 Календарь событий `/events`

**Данные:**
```ts
/**
 * Игровое событие.
 */
export interface GameEvent {
    id: string;
    title: string;
    description: string;
    type: 'hunger_games' | 'siege' | 'war' | 'fair' | 'server' | 'other';
    startsAt: string;   // ISO 8601
    endsAt?: string;
    settlementIds?: string[];
    createdBy: string;
}
```
API: `GET /v1/events?from=&to=` (публично), `POST/PATCH/DELETE /v1/events` (админ / глава поселения для своих осад).

**UI.**
- Страница `/events`: список ближайших событий по дням, фильтр по типу.
- Блок «Ближайшие события» (2–3 шт.) на главной вместо или рядом с «Пульсом сервера».
- Кнопка «В календарь» у каждого события: файл `.ics`.
- Набеги и войны, объявленные по правилам, автоматически попадают в календарь участникам (связь с 13.6).

Генерация `.ics` на фронте (`shared/lib/build-ics.function.ts`):
```ts
/**
 * Собирает iCalendar-файл для одного события.
 *
 * @param event Событие.
 * @returns Содержимое .ics.
 */
export function buildIcs(event: { id: string; title: string; description: string; startsAt: string; endsAt?: string }): string {
    const toIcsDate = (iso: string): string => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escape = (text: string): string => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const start = new Date(event.startsAt).toISOString();
    const end = new Date(event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 3600_000).toISOString()).toISOString();

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Last Hearth//Events//RU',
        'BEGIN:VEVENT',
        `UID:${event.id}@lasthearth.ru`,
        `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escape(event.title)}`,
        `DESCRIPTION:${escape(event.description)}`,
        `URL:https://lasthearth.ru/events#${event.id}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escape(event.title)}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}
```
Скачивание: `new Blob([buildIcs(e)], { type: 'text/calendar' })` + `URL.createObjectURL` + временная ссылка с `download="event.ics"`.

Плюс: бэкенд дублирует события в Discord Scheduled Events (`POST /guilds/{guild_id}/scheduled-events`, `entity_type: 3` — внешнее событие с `location: "Last Hearth"`). Discord сам напомнит подписавшимся.

**SEO.** Страница `/events` пререндерится (список на момент сборки) и попадает в sitemap.

### 13.4 Страница сезона `/season`

**Зачем.** Конец сезона и вайп — главный момент, когда игроки уходят. Нужны понятные сроки, итоги и причина вернуться в следующий сезон.

**Содержание:**
- Номер и название текущего сезона, дата начала, **таймер до конца** (дата из конфига бэкенда: `GET /v1/season/current → { number, title, started_at, ends_at }`).
- Итоги в реальном времени: самые крупные поселения, лидеры рейтинга, победители Голодных игр сезона (`/hungergames/seasons`).
- **Зал славы** прошлых сезонов: `/season/<номер>` — сюзерены, победители войн, лучшие игроки. Это архивный контент, который хорошо индексируется и которым делятся.
- Анонс следующего сезона: дата старта и что изменится.
- Что переносится в новый сезон (титулы, бейджи, «ветеран N сезонов») — это мотивирует вернуться.

### 13.5 Достижения и бейджи

Бейджи на публичном профиле (9.4) и в тултипе `player-chip`: «Основатель поселения», «Ветеран 3 сезонов», «Победитель Голодных игр», «100 часов», «Участник войны». Начисляются бэкендом по данным, которые уже есть (часы, поселения, сезоны ГИ). Модель:
```
GET /v1/users/{user_id}/badges → { badges: [{ key, title, icon, earned_at, season? }] }
```

### 13.6 Персональные уведомления об игровых событиях

Тот же механизм, что в 12.1 (`/notifications` + письмо + ЛС в Discord), для событий:
- на ваше поселение объявлен набег / война (время начала, ссылка на правила раздела);
- вас пригласили в поселение / ваша заявка на вступление одобрена;
- новая заявка на вступление (для глав);
- до конца сезона 7 дней / новый сезон стартовал.

В профиле — настройки: какие события присылать и куда (сайт / почта / Discord). Письма по умолчанию — только для важных (набег, решение по анкете, старт сезона), чтобы не уйти в спам.

### 13.7 «Что нового с вашего прошлого визита»

Для вернувшихся игроков, без бэкенда:
```ts
// при старте приложения (в браузере)
const lastVisit = storage.getItem<string>('lh-last-visit');
storage.setItem('lh-last-visit', new Date().toISOString());
```
На главной для авторизованных, если `lastVisit` старше 3 дней, — блок «Пока вас не было»: число новых новостей с `createdAt > lastVisit` (ссылки), новых дипломатических заявлений и, если игрок в поселении, изменения состава (по `updated_at`).

### 13.8 Реферальная награда за удержание, а не за регистрацию

Сейчас награда начисляется, «когда друзья присоединятся». Чтобы программа приводила игроков, которые остаются, а не регистрации:
- награда пригласившему — когда приглашённый наиграл, например, **10 часов за первые 14 дней**;
- в виджете `referral` показывать по каждому приглашённому прогресс: «Ник — 6/10 ч, осталось 9 дней»;
- приглашённому — стартовый бонус после верификации.

Правило реализуется на бэкенде по `hours_played`; фронту — расширить `ReferralStatsResponse` списком приглашённых с прогрессом.

### 13.9 Интерактивная карта мира

Веб-карта — один из самых сильных инструментов и для удержания (политика, планирование, обсуждения), и для привлечения (ей делятся). Для Vintage Story есть серверный мод **WebCartographer** (ModDB), который выгружает карту мира в статический веб-просмотрщик. Перед установкой проверить совместимость с версией сервера 1.22.

- Хостить на `map.lasthearth.ru` (отдельный nginx-сервер или отдельный `location` со своим `root`).
- Обновлять раз в сутки (ночью), чтобы карта не раскрывала свежие постройки в реальном времени.
- Не показывать позиции игроков онлайн; при необходимости закрывать новые территории в течение N дней.
- Поверх карты — маркеры поселений из `/settlements` со ссылками на `/settlements/:id` (если координаты решено показывать публично, см. 9.2).
- Ссылка «Карта» в шапке.

### 13.10 Возврат ушедших

- Письмо к старту нового сезона всем, кто играл в прошлом и дал согласие на рассылку: итоги игрока за прошлый сезон («120 часов, поселение X заняло 3-е место») + что нового. Согласие на рассылку — отдельная галочка в профиле (не путать с cookies).
- Telegram-канал с автопостингом новостей из RSS.
- Ссылки в письмах и постах — с UTM (`utm_source=email&utm_campaign=season_N`), чтобы видеть возвраты в Метрике и когортах.

---

## 14. Проверка после деплоя

### 14.1 Ответы сервера

```bash
for u in / /home /home/ /rules /rules/ /faq /start-game /settlements /diplomacy /gallery /videos /market \
         /profile /profile/stats /nope /favicon.ico /site.webmanifest /robots.txt /sitemap.xml; do
  printf "%-20s " "$u"
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://lasthearth.ru$u"
done
```

Ожидаемо:

| URL | Код |
|---|---|
| `/`, `/rules`, `/faq`, `/start-game`, `/settlements`, `/diplomacy`, `/gallery`, `/videos`, `/market` | 200 |
| `/home`, `/home/` | 301 → `https://lasthearth.ru/` |
| `/rules/` | 301 → `https://lasthearth.ru/rules` (https, без порта) |
| `/profile`, `/profile/stats` | 200 |
| `/nope` | 404 |
| `/favicon.ico`, `/site.webmanifest`, `/robots.txt`, `/sitemap.xml` | 200 |

### 14.2 Содержимое HTML

```bash
# Ссылки навигации есть в HTML главной
curl -s https://lasthearth.ru/ | grep -o 'href="/[a-z-]*"' | sort -u

# У каждой страницы свой title и canonical
for u in / /rules /faq /gallery /videos /diplomacy; do
  html=$(curl -s "https://lasthearth.ru$u")
  echo "$u | $(echo "$html" | grep -o '<title>[^<]*') | $(echo "$html" | grep -o 'rel="canonical" href="[^"]*"')"
done

# Пароль сервера не попадает в бандл (подставить старый пароль)
curl -s https://lasthearth.ru/ | grep -o 'src="[^"]*\.js"' | cut -d'"' -f2 | \
  xargs -I{} curl -s "https://lasthearth.ru/{}" | grep -c "СТАРЫЙ_ПАРОЛЬ"
```
Последняя команда проверяет только начальные чанки. Полную проверку делать по `dist/` после сборки: `grep -rl "СТАРЫЙ_ПАРОЛЬ" dist/` должна ничего не вывести.

### 14.3 Валидаторы

- Структурированные данные: [validator.schema.org](https://validator.schema.org/) и «Проверка результатов расширенного поиска» в Google для `/`, `/faq`, `/news/<id>`.
- Яндекс.Вебмастер → «Инструменты → Валидатор микроразметки».
- Превью ссылок: отправить `https://lasthearth.ru/rules` и `/news/<id>` себе в Telegram и Discord.
- Lighthouse (мобильный режим) для `/`, `/rules`, `/settlements`.
- Консоль браузера на всех страницах: нет ошибок гидратации `NG05xx` (раздел 8.2).

### 14.4 Через 2–4 недели

- Search Console и Вебмастер: число проиндексированных страниц выросло, ушли «Страница с переадресацией» и «Ложная ошибка 404».
- Метрика: конверсия по шагам воронки (11.3).
- Бэкенд: медиана времени проверки анкеты и конверсия `verification_approved → first_join` (11.4) — это главные метрики разделов 12–13.

---

## 15. Поправки к аудиту

При подготовке решений уточнились несколько пунктов `SEO_RETENTION_AUDIT.md`:

- **Новое, критичное:** пароль игрового сервера лежит в публичном JS-бандле (раздел 1). В аудите этого не было.
- **Отказ по анкете** уже позволяет подать её повторно (кнопка показывается при `status == "rejected"`). В аудите было написано, что второго шанса нет; правильнее — можно улучшить подачу (12.4).
- **FAQPage и HowTo:** Google с 2023 года почти не показывает эти расширенные сниппеты для обычных сайтов (FAQ — только авторитетным государственным и медицинским, HowTo — убран совсем). FAQPage всё равно стоит добавить (5.8), а HowTo на `/start-game` не нужен.
- **Список новостей** запрашивается без `page_size`, по умолчанию API отдаёт 15 штук, а новостей уже 16: самая старая на сайте не видна (9.1).
- **Публичный API поселений отдаёт координаты** — стоит решить, должно ли это быть публичным (9.2).
- **CSR-оболочка `index.csr.html`** уже собирается Angular, отдельная настройка `outputMode` не нужна: достаточно правильного fallback в nginx (3.1).
- **Manrope:** помимо трёх семейств из `index.html`, `taiga-ui-fonts.less` через `@import` грузит четвёртое семейство с Google Fonts (6.4).
