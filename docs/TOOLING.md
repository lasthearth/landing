# Инструменты и команды

> **Что это.** Что запускать, что доступно, а чего в проекте пока нет.

## Команды

| Команда                            | Что делает                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `npm start` / `npm run dev`        | dev-сервер на `127.0.0.1:4200` (через dotenv)                                                                                                        |
| `npm run build`                    | прод-сборка SSR под замком `.build.lock`: пререндер разделов (список — `src/app/app.routes.server.ts`)                                               |
| `npm run verify`                   | **обязательный минимум**: окружение, формат доков, бюджет контекста, указатели, границы FSD, локали, контраст, типы, ESLint                          |
| `npm run verify:full`              | то же + `ng build` + Vitest + тесты холста в Chrome (если он найден)                                                                                 |     |
| `npm run arch`                     | границы FSD; `--update-baseline` фиксирует легаси-нарушения                                                                                          |
| `npm run map`                      | перегенерировать `docs/project-map.md`                                                                                                               |
| `npm run i18n`                     | `stats \| check \| find \| get \| set` — правка словарей без чтения файла (`docs/I18N.md`)                                                           |
| `npm run sitemap`                  | `public/sitemap.xml`: разделы, статьи, новости, поселения, игроки. Выполняется сам перед `npm run build`; без API оставляет прежний файл             |
| `npm run icons`                    | иконки из `public/`: `favicon.ico` (16/32/48), `icon-192/512.png`, `icon-maskable-512.png`; результат коммитится, в сборке не нужен                  |
| `npm run context:cost`             | стоимость агентских документов в токенах + бюджеты                                                                                                   |
| `npm run format` / `format:check`  | prettier по агентским документам и `scripts/`                                                                                                        |
| `node scripts/archive-history.mjs` | переносит старейшие записи `### 3.-*` из `docs/history.md` в архив, пока летопись держит бюджет 120 kB                                               |
| `node scripts/visual-check.mjs`    | скриншот dev-сервера в настоящем Chrome: `--url`, `--width`, `--clip`, `--out`, `--auth` (подставной вход игрока в шапке)                            |
| `npm test` / `npm run test:watch`  | Vitest + jsdom через `@angular/build:unit-test`; браузер не нужен                                                                                    |
| `npm run test:coverage`            | то же с отчётом покрытия в `coverage/`                                                                                                               |
| `npm run test:browser`             | Vitest в Chromium для трёх спеков, которым нужен настоящий браузер (холст и живая геометрия)                                                         |
| `npm run test:ci`                  | оба прогона подряд                                                                                                                                   |
| `npm run lint`                     | ESLint по `src`: `any`, `console.log`, селекторы, шаблонные правила (`eslint.config.mjs`); единственный шаг быстрого прогона, который парсит шаблоны |
| `npm run bootstrap`                | `npm ci` в текущем чекауте или worktree — ровные версии из `package-lock.json`                                                                       |
| `npm run history`                  | `add "Заголовок" --body-file <путь>`: сам берёт следующий номер `3.-NN`, вставляет запись, гонит архив и бюджет 120 kB                               |

## Ограничения агентских песочниц (важно)

| Что                                       | Как обойти                                                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node_modules` недоступен для записи      | установка пакетов требует подтверждения администратора сессии                                                                                                                                      |
| `ng build` падает на `esbuild` со `EPERM` | сборке нужен обычный терминал; в песочнице её заменяет `tsc --noEmit` внутри `npm run verify`                                                                                                      |
| Браузер Playwright не установлен          | `npm test` работает и без браузера; без Chromium пропускается только `npm run test:browser`: `npx playwright install chromium`                                                                     |
| `git` не пишет `.git/index.lock`          | коммиты и `git mv` — в своём терминале                                                                                                                                                             |
| npm-кэш вне воркспейса закрыт             | `npm i --cache ./.npm-cache ...`                                                                                                                                                                   |
| Worktree без `node_modules`               | `npm run bootstrap` в worktree. Симлинк `ln -s <корень-репо>/node_modules node_modules` годится, только если родитель установлен свежим: устаревший родитель даёт красный `verify` с чужой ошибкой |

Скрипты, которые пишут файлы, умеют печатать результат вместо записи:

```bash
node scripts/check-architecture.mjs --update-baseline --stdout
node scripts/gen-project-map.mjs --stdout
node scripts/history-tool.mjs add "Заголовок" --body-file entry.md --stdout
node scripts/i18n-tool.mjs set rules rules.title "Новый заголовок" --print
```

## Несколько агентов в одном worktree

Проверено на семи субагентах в общей копии: правки одного ломают сборку соседям, и соседи
тратят по одной-три сборки на чужую ошибку.

Порядок:

1. Глобальные механические правки (скрипт по сотне файлов) — **до** веера. Пока скрипт правит
   файлы, субагентов не запускайте: их чтение попадёт на середину правки.
2. Веер по непересекающимся файлам. В задании субагенту пишите: проектную сборку не запускать.
3. `npm run verify:full` гоняет ведущий один раз, после веера.

Замок `.build.lock` не даёт двум сборкам писать в `dist/` одновременно: второй процесс падает
сразу и называет pid владельца. Обход замка — только прямым `ng build` в обход `npm run build`.

## Тесты

Два прогона, потому что jsdom не умеет холст:

- `npm test` — Vitest + jsdom, билдер `@angular/build:unit-test`, цель `test` в `angular.json`.
  Спецификации собраны по `tsconfig.spec.json` (типы `vitest/globals`) и лежат рядом с кодом.
- `npm run test:browser` — тот же Vitest, но в Chromium через Playwright, цель
  `test-browser`, `tsconfig.spec.browser.json`. Три файла, которым нужен настоящий
  браузер: два про холст (`createImageBitmap` и 2D-контекст) и
  `src/app/shared/lib/directives/tabs-pill.directive.spec.ts` — живая геометрия
  DOM-rect, которой jsdom не даёт. Список продублирован в `exclude` цели `test` —
  новый браузерный спек добавляйте в оба места. Браузер ставится один раз:
  `npx playwright install chromium`.

Холст в jsdom не починить: пакет `canvas` тянет install-скрипт `prebuild-install`,
который агентская песочница блокирует, а `@napi-rs/canvas` под именем `canvas`
роняет jsdom 26 на `ctx.canvas` — у skia-контекста это свойство только для чтения.

В новых спеках используйте матчеры Vitest: `toBe(true)` вместо `toBeTrue()`,
`expect(p).resolves` вместо `expectAsync(p)`, `vi.fn()` и `vi.spyOn()` вместо
`jasmine.createSpy()` и `spyOn()`, тип `Mocked<T>` вместо `jasmine.SpyObj<T>`,
`firstValueFrom()` вместо колбэка `done: DoneFn`.

Запускайте тесты только этими командами. Прямой `npx vitest` не читает цель `test`
в `angular.json`: он собирает спеки и из `.agents/worktrees/`, где резолвинг псевдонимов
`@core/*` падает, и прогон заканчивается шестью ошибками импорта.

## Что есть, но не настроено

- **codegraph**: в корне лежит индекс `.codegraph/` (~11 MB), но CLI не установлен и MCP-сервер не подключён,
  поэтому опираться на него нельзя — используйте `grep`/`glob`/`read`.
  Включить: `npm i -g @colbymchenry/codegraph`, затем `codegraph status|query|affected`.
- **CI**: `.github/workflows/verify.yml` прогоняет `npm ci` + `npm run verify` на push в `main` и на PR.
  Сборка и тесты там не запускаются: шаг намеренно оставлен быстрым. Замените команду на
  `npm run verify:full`, если хотите проверять в CI бандл и тесты — браузерным спекам нужен
  `npx playwright install chromium` отдельным шагом.

## GitHub CLI

`gh` стоит в `/opt/homebrew/bin/gh`, которого нет в PATH шеллов харнеса:
перед командами делайте `export PATH="/opt/homebrew/bin:$PATH"`.
Вход выполнен под аккаунтом ripls56 (keyring), git-протокол — ssh, поэтому
`gh pr create|merge` работают без дополнительных токенов. Области `workflow` у токена нет:
правки `.github/workflows/*` такой пуш отклоняет, их отправляют с токеном, у которого есть `workflow`.
