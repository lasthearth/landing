# Инструменты и команды

> **Что это.** Что запускать, что доступно, а чего в проекте пока нет.

## Команды

| Команда                           | Что делает                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm start` / `npm run dev`       | dev-сервер на `127.0.0.1:4200` (через dotenv)                                                                                            |
| `npm run build`                   | прод-сборка SSR: пререндер заранее собранных разделов (список — `src/app/app.routes.server.ts`)                                          |
| `npm run verify`                  | **обязательный минимум**: формат доков, бюджет контекста, указатели, границы FSD, локали, контраст, типы                                 |
| `npm run verify:full`             | то же + `ng build` + тесты (если найден Chrome)                                                                                          |
| `npm run arch`                    | границы FSD; `--update-baseline` фиксирует легаси-нарушения                                                                              |
| `npm run map`                     | перегенерировать `docs/project-map.md`                                                                                                   |
| `npm run i18n`                    | `stats \| check \| find \| get \| set` — правка словарей без чтения файла (`docs/I18N.md`)                                               |
| `npm run clarity`                 | `check \| dashboard \| recordings \| docs \| raw` — данные Clarity из терминала, без входа в дашборд (раздел «Clarity» ниже)             |
| `npm run sitemap`                 | `public/sitemap.xml`: разделы, статьи, новости, поселения, игроки. Выполняется сам перед `npm run build`; без API оставляет прежний файл |
| `npm run icons`                   | иконки из `public/`: `favicon.ico` (16/32/48), `icon-192/512.png`, `icon-maskable-512.png`; результат коммитится, в сборке не нужен      |
| `npm run context:cost`            | стоимость агентских документов в токенах + бюджеты                                                                                       |
| `npm run format` / `format:check` | prettier по агентским документам и `scripts/`                                                                                            |
| `npm test` / `npm run test:ci`    | Karma + Jasmine (нужен Chrome; путь можно задать через `CHROME_BIN`)                                                                     |

## Ограничения агентских песочниц (важно)

| Что                                       | Как обойти                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `node_modules` недоступен для записи      | установка пакетов требует подтверждения администратора сессии                                 |
| `ng build` падает на `esbuild` со `EPERM` | сборке нужен обычный терминал; в песочнице её заменяет `tsc --noEmit` внутри `npm run verify` |
| Chrome не установлен                      | тесты пропускаются; задайте `CHROME_BIN`                                                      |
| `git` не пишет `.git/index.lock`          | коммиты и `git mv` — в своём терминале                                                        |
| npm-кэш вне воркспейса закрыт             | `npm i --cache ./.npm-cache ...`                                                              |

Скрипты, которые пишут файлы, умеют печатать результат вместо записи:

```bash
node scripts/check-architecture.mjs --update-baseline --stdout
node scripts/gen-project-map.mjs --stdout
node scripts/i18n-tool.mjs set rules rules.title "Новый заголовок" --print
```

## Что есть, но не настроено

- **codegraph**: в корне лежит индекс `.codegraph/` (~11 MB), но CLI не установлен и MCP-сервер не подключён,
  поэтому опираться на него нельзя — используйте `grep`/`glob`/`read`.
  Включить: `npm i -g @colbymchenry/codegraph`, затем `codegraph status|query|affected`.
- **ESLint**: не установлен. Границы FSD проверяет `scripts/check-architecture.mjs` (без зависимостей),
  а стилевые запреты (hex-цвета, `transition: all`, `console.log`, `any`) пока живут только в прозе.
  Подключение: `npm i -D eslint angular-eslint typescript-eslint --cache ./.npm-cache` (`docs/TODO.md`).
- **Vitest**: не установлен; тесты — Karma + Jasmine (4 спека), на машинах без Chrome не запускаются.
  Перевод: `npm i -D vitest jsdom --cache ./.npm-cache` + билдер `@angular/build:unit-test` (`docs/TODO.md`).
- **CI**: `.github/workflows/verify.yml` прогоняет `npm ci` + `npm run verify` на push в `main` и на PR.
  Сборка и тесты там не запускаются: на раннере GitHub браузер есть, но шаг намеренно оставлен быстрым —
  замените команду на `npm run verify:full`, если хотите проверять в CI бандл и тесты.

## Clarity: как агент читает данные

Клиент — `scripts/clarity.mjs`, зависимостей нет. Он обращается к тем же эндпоинтам, что и официальный MCP-сервер
`@microsoft/clarity-mcp-server`: POST на `https://clarity.microsoft.com/mcp/dashboard/query`,
`https://clarity.microsoft.com/mcp/recordings/sample` и `https://clarity.microsoft.com/mcp/documentation/query`
с заголовком `Authorization: Bearer <токен>`.

**Токен.** Clarity → проект (id `u3k2hyqs0a`) → Settings → Data Export → Generate new API token; создаёт только
администратор проекта. Храним вне репозитория: %USERPROFILE%\\.dsh\\clarity\\.env строкой `CLARITY_API_TOKEN=…`.
Порядок поиска: `--token`, переменная окружения, файл из `CLARITY_ENV_FILE`, файл в `.dsh`, затем корневой `.env`
(он закрыт в `.gitignore`). В коммит токен не попадает.

```bash
npm run clarity -- check
npm run clarity -- dashboard "трафик и глубина скролла по устройствам за 3 дня"
npm run clarity -- recordings --days 2 --count 20 --rage --js-error
npm run clarity -- recordings --url /market --device Mobile --json --out clarity-market.json
npm run clarity -- docs "как поставить custom tag"
```

**Лимиты.** 10 запросов на проект в сутки (иначе 429), окно данных 1–3 дня, не более 250 сессий в выборке,
время в ответе — UTC. Запросы планируем заранее: один `dashboard` с нужными измерениями вместо пяти уточняющих.

**Что отдаёт `recordings`.** Список сессий с метаданными, фильтрами и ссылкой на запись. Видео и DOM-реплей
по API не скачиваются — только по ссылке в браузере. Записи есть лишь у тех, кто дал согласие на аналитику:
Clarity подключается по сигналу `ConsentService` в `src/app/core/services/analytics.service.ts`.

**Опционально: те же данные как MCP-инструменты.** Официальный сервер (MIT) даёт инструменты
`query-analytics-dashboard`, `list-session-recordings`, `query-documentation-resources`. Чтобы токен не лежал
в конфиге профиля, запускают обёртку, которая читает `.env` и передаёт токен процессу:

```js
// %USERPROFILE%\.dsh\clarity\run.mjs  (npm i @microsoft/clarity-mcp-server в этой же папке)
import { readFileSync } from 'node:fs';

const line = readFileSync(new URL('.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .find((item) => item.startsWith('CLARITY_API_TOKEN='));

process.env['CLARITY_API_TOKEN'] = line.slice('CLARITY_API_TOKEN='.length).trim();

await import('@microsoft/clarity-mcp-server');
```

В списке `insert` профиля DSH (`cordis.patch.yml`) это запись с `transport: stdio`, `serverName: clarity`,
`command` — node и `args` — путь к обёртке; инструменты появятся после перезапуска DSH.
