# Слоп: что линтер не даёт написать

> **Что это.** Правила против «слопа» — кода, который выглядит рабочим, но держится на догадке:
> непроверенный каст, `!` вместо проверки, потерянный `catch`, метод с аргументами в шаблоне,
> цвет мимо токена. Каждое правило измерено на этом репозитории; старые нарушения заморожены
> бейзлайном, новое валит проверку.
>
> Агент читает этот файл перед правкой кода. Правила, которые уже были, — в `AGENTS.md` и
> `AGENT_RULES_MAP.md`; здесь только то, что добавилось.

## Как проверить и как починить

```bash
npm run lint                    # ESLint через scripts/lint.mjs: бейзлайн + новые нарушения
npm run lint:rules              # тесты локальных правил tools/eslint-rules (node --test)
node scripts/check-component-styles.mjs   # LESS: цвет, !important, z-index
```

- `npx eslint src` показывает **все** нарушения, включая замороженные. Им не проверяют: вердикт даёт только `npm run lint`.
- Новое нарушение — ошибка. Лечится кодом, а не бейзлайном.
- Бейзлайн (`scripts/lint-baseline.json`, `scripts/style-baseline.json`) **только сокращается**:
  убрали нарушение — `--update-baseline` уменьшит бюджет. Растить бюджет нельзя.
- Ключ бейзлайна — `правило|файл|текст сообщения`, поэтому сдвиг строк его не ломает.

## Правила ESLint

| Правило                                                     | Что ловит                                                            | Легаси |
| ----------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| `@typescript-eslint/no-non-null-assertion`                  | `x!`: обещание, что значения нет; проверяется только в рантайме      | 0      |
| `@typescript-eslint/no-unsafe-type-assertion`               | `as X` в тип, к которому значения не приводили                       | 104    |
| `@typescript-eslint/no-unnecessary-type-assertion`          | каст, который ничего не меняет: шум вокруг типа                      | 1      |
| `@typescript-eslint/no-unnecessary-condition`               | проверка, которая по типу всегда истинна или всегда ложна            | 190    |
| `@typescript-eslint/no-unnecessary-boolean-literal-compare` | `x === true`, `x !== false` на булевом значении                      | 0      |
| `@typescript-eslint/no-floating-promises`                   | Promise без `await`, `.catch` или `void`: исключение уходит в никуда | 0      |
| `@typescript-eslint/no-misused-promises`                    | `async`-функция там, где ждут `void`                                 | 0      |
| `@typescript-eslint/prefer-nullish-coalescing`              | логическое ИЛИ на значении, где `0` и `''` законны                   | 46     |
| `@typescript-eslint/prefer-optional-chain`                  | `a && a.b && a.b.c` вместо `a?.b?.c`                                 | 7      |
| `@typescript-eslint/no-unused-private-class-members`        | мёртвый приватный член                                               | 0      |
| `@typescript-eslint/no-unused-expressions`                  | выражение без эффекта                                                | 0      |
| `@typescript-eslint/switch-exhaustiveness-check`            | `switch` по union без ветки для нового значения                      | 16     |
| `no-restricted-globals` (`document`, `window`)              | глобал браузера: на сервере его нет, SSR-страница падает             | 137    |
| `no-restricted-syntax` (`subscribe` в `subscribe`)          | вложенная подписка: внешняя течёт, отписка не доходит                | 42     |
| `no-restricted-syntax` (`catch` с `return` без вызова)      | ошибка, которую поймали и молча потеряли                             | 42     |
| `no-restricted-syntax` (литерал `ru-RU`/`en-GB`/`en-US`)    | локаль, зашитая строкой                                              | 42     |
| `lh/no-comment-restates-code`                               | комментарий, который пересказывает соседнюю строку                   | 0      |
| `lh/no-effect-signal-write`                                 | `effect`, который пишет в сигнал: два источника истины               | 5      |

Правила с типами (`no-unnecessary-condition`, `no-unsafe-type-assertion`, `switch-exhaustiveness-check`)
работают только при `parserOptions.projectService: true` в `eslint.config.mjs`: без проекта TypeScript
они молча ничего не находят.

## Правила для шаблонов

| Правило                                                    | Что ловит                                                                  | Легаси |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| `template/click-events-have-key-events`                    | клик по неинтерактивному элементу: клавиатурой не достать                  | 45     |
| `template/interactive-supports-focus`                      | интерактивный обработчик на элементе без фокуса                            | 39     |
| `template/mouse-events-have-key-events`                    | `mouseenter`/`mouseleave` без клавиатурного двойника                       | 3      |
| `template/label-has-associated-control`                    | `<label>` без привязки к полю                                              | 18     |
| `template/role-has-required-aria`, `template/valid-aria`   | ARIA-роль без обязательных свойств, неизвестное свойство                   | 0      |
| `template/button-has-type`                                 | `<button>` без `type`: внутри формы уходит в submit                        | 0      |
| `template/no-positive-tabindex`                            | `tabindex` больше нуля: ломает порядок обхода                              | 0      |
| `template/no-any`                                          | `$any()` в разметке                                                        | 0      |
| `template/no-inline-styles`                                | `style="…"` и `[style.x]` вместо класса                                    | 32     |
| `template/no-empty-control-flow`                           | пустой `@if`/`@for`                                                        | 0      |
| `template/use-track-by-function`                           | `@for` без устойчивого `track`                                             | 0      |
| `template/no-nested-tags`                                  | вложенный интерактив: две цели на один клик                                | 0      |
| `template/prefer-at-else`                                  | `@if (a) {} @if (!a) {}` вместо `@else`                                    | 0      |
| `template/prefer-self-closing-tags`                        | `<app-x></app-x>` вместо `<app-x />`                                       | 0      |
| `template/prefer-static-string-properties`                 | `[value]="'строка'"` вместо `value="строка"`                               | 0      |
| `template/no-interpolation-in-attributes`                  | `attr="{{ x }}"` вместо `[attr]="x"`                                       | 0      |
| `template/no-distracting-elements`, `template/table-scope` | `<marquee>` на странице                                                    | 0      |
| `lh/no-method-call-with-args`                              | метод с аргументами в шаблоне: вызов на каждом цикле обнаружения изменений | 262    |
| `lh/no-spec-without-assert`                                | тест без проверки: такой тест не падает ни на чём                          | 0      |

## Проверки LESS (`scripts/check-component-styles.mjs`)

| Проверка        | Что ловит                                      | Легаси |
| --------------- | ---------------------------------------------- | ------ |
| `hexColour`     | `#rgb`, `rgb()`, `hsl()` мимо токенов `--lh-*` | 415    |
| `bareImportant` | `!important` без объяснения рядом              | 15     |
| `literalZIndex` | `z-index: 7` вместо `var(--lh-z-*)`            | 71     |

## Что заморожено и почему

Бейзлайн — это долг, а не разрешение. Крупные статьи:

- `lh/no-method-call-with-args` 262: шаблоны зовут `formatX(...)`/`statusText(...)` прямо в разметке.
  Правка — вынести в `computed`; каждый такой перевод меняет поведение страницы, поэтому идёт отдельными задачами.
- `no-unnecessary-condition` 190 и `no-unsafe-type-assertion` 104: часть проверок держит данные API,
  у которых тип обещает больше, чем отдаёт сервер. Снимать их можно только с проверкой на живом бэкенде.
- `no-restricted-globals` 137: перевод 48 файлов на `inject(DOCUMENT)`/`inject(WINDOW)`.
- Клик по диву 84 и `<label>` без привязки 18: перевод на `<button>` меняет разметку и стили, нужен визуальный прогон.
- `hexColour` 415: каждому литералу нужен осмысленный токен, это решение дизайнера, а не переименование.

## Что проверено и не стало правилом

| Наблюдение                                             | Почему нет правила                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `catchError(() => of(null))` в 90 местах               | Это решение интерцептора (`error.interceptor.ts`): ошибка показана, поток закрыт штатно |
| `subscribe` без `takeUntilDestroyed` в 94 местах       | Одноразовый HTTP и `dialog.open()` завершаются сами; правило валило бы верный код       |
| `.subscribe(x => signal.set(x))` в 19 местах           | `toSignal` живёт до уничтожения компонента, а здесь разовая мутация                     |
| `any`, `@ts-ignore`, закомментированный код            | В коде их нет; правила на нулевой счёт не заводим                                       |
| Вложенность LESS глубже 2, скопированное кольцо фокуса | Это решения дизайна; проверка ловила бы разметку, а не ошибку                           |
| `template/i18n` и запрет текста без перевода           | В проекте перевод через пайп, готовое правило не подходит                               |
| `template/no-call-expression` целиком                  | В сигнальном коде `count()` — чтение сигнала, правило валило бы всё                     |
| `template/attributes-order`, `cyclomatic-complexity`   | Форматирование и размер функций: шум, а не слоп                                         |

## Источник правил

Правила выведены из замера: 713 файлов TS, 193 шаблона, 131 файл LESS, 34 спека.
Итог замера — 1448 легаси-нарушений на 2026-11-19; из них 947 заморожено `scripts/lint-baseline.json`
и 501 — `scripts/style-baseline.json`. Добавлено 37 проверок ESLint (35 правил и два `no-restricted-*`
с тремя селекторами) и 3 проверки LESS. Из 37 проверок 22 уже держат код на нуле, 15 несут долг.
