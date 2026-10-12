# Инструменты и команды

> **Что это.** Что запускать, что доступно, а чего в проекте пока нет.

## Команды

| Команда                           | Что делает                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm start` / `npm run dev`       | dev-сервер на `127.0.0.1:4200` (через dotenv)                                                            |
| `npm run build`                   | прод-сборка с пререндером (роуты из `routes.txt`)                                                        |
| `npm run verify`                  | **обязательный минимум**: формат доков, бюджет контекста, указатели, границы FSD, локали, контраст, типы |
| `npm run verify:full`             | то же + `ng build` + тесты (если найден Chrome)                                                          |
| `npm run arch`                    | границы FSD; `--update-baseline` фиксирует легаси-нарушения                                              |
| `npm run map`                     | перегенерировать `docs/project-map.md`                                                                   |
| `npm run i18n`                    | `stats \| check \| find \| get \| set` — правка словарей без чтения файла (`docs/I18N.md`)               |
| `npm run context:cost`            | стоимость агентских документов в токенах + бюджеты                                                       |
| `npm run format` / `format:check` | prettier по агентским документам и `scripts/`                                                            |
| `npm test` / `npm run test:ci`    | Karma + Jasmine (нужен Chrome; путь можно задать через `CHROME_BIN`)                                     |

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
