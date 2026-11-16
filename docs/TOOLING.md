# Инструменты и команды

> **Что это.** Что запускать, что доступно, а чего в проекте пока нет.

## Команды

| Команда                           | Что делает                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `npm start` / `npm run dev`       | dev-сервер на `127.0.0.1:4200` (через dotenv)                                                                                            |
| `npm run build`                   | прод-сборка SSR: пререндер заранее собранных разделов (список — `src/app/app.routes.server.ts`)                                          |
| `npm run verify`                  | **обязательный минимум**: формат доков, бюджет контекста, указатели, границы FSD, локали, контраст, типы                                 |
| `npm run verify:full`             | то же + `ng build` + Vitest + тесты холста в Chrome (если он найден)                                                                     |     |
| `npm run arch`                    | границы FSD; `--update-baseline` фиксирует легаси-нарушения                                                                              |
| `npm run map`                     | перегенерировать `docs/project-map.md`                                                                                                   |
| `npm run i18n`                    | `stats \| check \| find \| get \| set` — правка словарей без чтения файла (`docs/I18N.md`)                                               |
| `npm run sitemap`                 | `public/sitemap.xml`: разделы, статьи, новости, поселения, игроки. Выполняется сам перед `npm run build`; без API оставляет прежний файл |
| `npm run icons`                   | иконки из `public/`: `favicon.ico` (16/32/48), `icon-192/512.png`, `icon-maskable-512.png`; результат коммитится, в сборке не нужен      |
| `npm run context:cost`            | стоимость агентских документов в токенах + бюджеты                                                                                       |
| `npm run format` / `format:check` | prettier по агентским документам и `scripts/`                                                                                            |
| `npm test` / `npm run test:watch` | Vitest + jsdom через `@angular/build:unit-test`; браузер не нужен                                                                        |
| `npm run test:coverage`           | то же с отчётом покрытия в `coverage/`                                                                                                   |
| `npm run test:browser`            | Karma + ChromeHeadless для двух спеков с настоящим холстом: `compress-image` и `image-file-input`                                        |
| `npm run test:ci`                 | оба прогона подряд                                                                                                                       |

## Ограничения агентских песочниц (важно)

| Что                                       | Как обойти                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `node_modules` недоступен для записи      | установка пакетов требует подтверждения администратора сессии                                                        |
| `ng build` падает на `esbuild` со `EPERM` | сборке нужен обычный терминал; в песочнице её заменяет `tsc --noEmit` внутри `npm run verify`                        |
| Chrome не установлен                      | `npm test` работает и без браузера; без Chrome пропускается только `npm run test:browser` (или задайте `CHROME_BIN`) |
| `git` не пишет `.git/index.lock`          | коммиты и `git mv` — в своём терминале                                                                               |
| npm-кэш вне воркспейса закрыт             | `npm i --cache ./.npm-cache ...`                                                                                     |
| Worktree без `node_modules`               | симлинк из основного чекаута: `ln -s <корень-репо>/node_modules node_modules`                                        |

Скрипты, которые пишут файлы, умеют печатать результат вместо записи:

```bash
node scripts/check-architecture.mjs --update-baseline --stdout
node scripts/gen-project-map.mjs --stdout
node scripts/i18n-tool.mjs set rules rules.title "Новый заголовок" --print
```

## Тесты

Два прогона, потому что jsdom не умеет холст:

- `npm test` — Vitest + jsdom, билдер `@angular/build:unit-test`, цель `test` в `angular.json`.
  Спецификации собраны по `tsconfig.spec.json` (типы `vitest/globals`) и лежат рядом с кодом.
- `npm run test:browser` — Karma + Jasmine в ChromeHeadless, цель `test-browser`, `tsconfig.spec.browser.json`.
  Только два файла, которым нужны `createImageBitmap` и 2D-контекст:
  `src/app/shared/lib/compress-image.function.spec.ts` и
  `src/app/shared/ui/image-file-input/image-file-input.component.spec.ts`.
  Список продублирован в `exclude` цели `test` — новый спек про холст добавляйте в оба места.

Холст в jsdom не починить: пакет `canvas` тянет install-скрипт `prebuild-install`,
который агентская песочница блокирует, а `@napi-rs/canvas` под именем `canvas`
роняет jsdom 26 на `ctx.canvas` — у skia-контекста это свойство только для чтения.

В новых спеках используйте матчеры Vitest: `toBe(true)` вместо `toBeTrue()`,
`expect(p).resolves` вместо `expectAsync(p)`, `vi.fn()` и `vi.spyOn()` вместо
`jasmine.createSpy()` и `spyOn()`, тип `Mocked<T>` вместо `jasmine.SpyObj<T>`,
`firstValueFrom()` вместо колбэка `done: DoneFn`.

## Что есть, но не настроено

- **codegraph**: в корне лежит индекс `.codegraph/` (~11 MB), но CLI не установлен и MCP-сервер не подключён,
  поэтому опираться на него нельзя — используйте `grep`/`glob`/`read`.
  Включить: `npm i -g @colbymchenry/codegraph`, затем `codegraph status|query|affected`.
- **ESLint**: не установлен. Границы FSD проверяет `scripts/check-architecture.mjs` (без зависимостей),
  а стилевые запреты (hex-цвета, `transition: all`, `console.log`, `any`) пока живут только в прозе.
  Подключение: `npm i -D eslint angular-eslint typescript-eslint --cache ./.npm-cache` (`docs/TODO.md`).
- **CI**: `.github/workflows/verify.yml` прогоняет `npm ci` + `npm run verify` на push в `main` и на PR.
  Сборка и тесты там не запускаются: на раннере GitHub браузер есть, но шаг намеренно оставлен быстрым —
  замените команду на `npm run verify:full`, если хотите проверять в CI бандл и тесты.
