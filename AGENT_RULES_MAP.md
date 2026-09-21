# AGENT_RULES_MAP.md — Карта правил проекта для агента

> Сжатая, проверенная по коду карта всех правил Last Hearth Landing.
> Источники: `AGENTS.md` (конституция), `PROJECT_MAP.md` (история и дизайн-система),
> `API_CONTRACT.md` (бэкенд-контракт), `angular.json`, `tsconfig.json`, `.prettierrc`, `.editorconfig`.
> **Отличие от AGENTS.md:** здесь отмечены места, где документация расходится с фактической структурой (см. §10).

---

## 1. Стек (факты)

- Angular 20, standalone-only, signals, `strict` TS 5.9, `strictTemplates`.
- Сборщик `@angular/build:application` (Vite), SSR + пререндер из `routes.txt` (`discoverRoutes: false`).
- Стили: LESS (компонентные) + Tailwind v4 + глобальный `src/styles.css` (токены).
- UI: Taiga UI 4.x; OIDC: `angular-auth-oidc-client` + Logto; HTTP: `HttpClient` (fetch) + интерцепторы.
- Тесты: Karma + Jasmine (`npm test`). State: сервисы/сигналы, без NgRx.
- Бюджеты сборки: initial warn 1.4 MB / error 1.8 MB; anyComponentStyle 12/18 kB.

## 2. Архитектура FSD — как есть и как надо

**Целевая модель (писать новый код по ней):**
`app → pages → widgets → features → entities → shared`. Импорты только вниз.

**Фактическое состояние (миграция не завершена):**
- Реально существуют: `core/`, `entities/`, `features/`, `layout/`, `routes/`, `shared/`, `styles/`.
- `pages/` и `widgets/` как каталоги **отсутствуют** — страницы живут внутри `features/*` (home, rules, market, faq и т.д.), виджеты влиты в features (`features/settlements/settlement-card` и пр.).
- Слайс = `index.ts` (публичный API) + `ui/ model/ api/ lib/ config/`. Импорт из слайса — **только через `index.ts`**, никогда из внутренних файлов.

**Path aliases (реально в `tsconfig.json`):**
`@app/* @routes/* @layout/* @core/* @shared/* @entities/* @features/* @pages/*`
(`@pages` указывает на несуществующий каталог — не использовать, пока слой не создан; `@widgets` отсутствует — при появлении слоя добавить alias).

## 3. Код: жёсткие правила

1. **1 файл = 1 сущность** (класс/интерфейс/тип/функция/константа). Исключение — приватный вспомогательный тип, не используемый снаружи.
2. Standalone-компоненты, `ChangeDetectionStrategy.OnPush`, префикс `app`, селекторы kebab-case, классы PascalCase. Файлы: `x.component.{ts,html,less,spec.ts}` (spec — placeholder).
3. **JSDoc на русском для каждого публичного элемента**: класс/интерфейс/enum — назначение; поле — что содержит; метод/функция — описание + `@param` каждого аргумента + `@returns`. Нетривиальные приватные — тоже.
4. Сервисы: `providedIn: 'root'`, нейминг `*Service` (API/логика) / `*Store` (state).
5. Порядок импортов: Angular → RxJS → сторонние (Taiga, OIDC) → aliases `@...` → относительные (только внутри слайса).
6. Бизнес-логика — в сервисах/сторах, не в компонентах. `any` запрещён. `console.log` запрещён (только `console.error` для критики).
7. NgModule не создавать. Не трогать `node_modules/`, `dist/`.

## 4. Форматирование (`.prettierrc` + `.editorconfig`)

- Отступ **4 пробела**, ширина **120**, одинарные кавычки, `semi: true`, trailing comma es5, `arrowParens: always`, LF, финальный newline, trim trailing whitespace (кроме .md).
- HTML: двойные кавычки, `htmlWhitespaceSensitivity: ignore`, `bracketSameLine: false`.
- JSON: двойные кавычки, 4 пробела. CSS/LESS: hex в нижнем регистре.

## 5. Стили и дизайн-система (критично)

**Цвета:** только семантические токены `--lh-*` из `src/styles.css` (группы: surface/line/ink/parchment/night/wood/brand/статусы/ранги/покупки/редкость). Экспортированы в Tailwind через `@theme`.
- ❌ `bg-[#hex]` / `text-[#hex]` в шаблонах и TS — запрещены.
- Для текста — только `*-ink`-варианты (затемнены под WCAG AA).
- Тёмная тема = только переопределение значений переменных в `html[data-theme='dark']`, без хаков по селекторам классов.
- После смены палитры: `node scripts/check-contrast.mjs`.

**Motion:**
- Свои кривые: `--lh-ease-smooth/-spring/-out-quart`, длительности `--lh-dur-fast/mid/slow` (200/450/800ms). Дефолтные `ease*` запрещены (кроме бесконечных пульсаций).
- `transition: all` запрещён — перечислять свойства. `blur()` в анимациях появления запрещён.
- Каждая анимация обязана иметь ветку `prefers-reduced-motion`.

**Поверхности/компоненты (`src/styles.css`, `@layer components`):** `.lh-panel`, `.lh-panel--bezel` + `.lh-panel__core` (радиус ядра = `calc(radius - gap)`), `.lh-shadow`, `.lh-card-glow`, `.nav-button`, `.lh-cta`, `.lh-reveal` + `appReveal` (единственный механизм scroll-появления), `.lh-display` (Almendra: 1 `h1` на страницу + заголовки секций, не на абзацах), `.lh-tag`.

**LESS-правила:** вложенность ≤ 2 уровней; `!important` — только с комментарием-обоснованием. Глобальные переменные: `src/app/shared/styles/variables.less` (⚠️ AGENTS.md указывает устаревший путь `src/app/styles/`).

## 6. i18n (кастомный, `@core/i18n`)

- Pipe `translate`, словари `*.i18n.ts` (ru/en), реестр `TRANSLATIONS` в `core/i18n/translations/registry.ts`.
- Общие словари грузятся сразу; страничные — лениво через `loadPage()` (`core/i18n/lib/load-page.function.ts`) вместе с роутом.
- Любой новый текст — в обе локали; проверка: `node scripts/check-i18n.mjs <файл.i18n.ts>`.
- Словарь должен подгружаться на роуте, где используется (пример-ловушка: `/profile/admin` не грузит словарь поселений).

## 7. HTTP и ошибки

- Все запросы через `authInterceptor`; базовый URL из `core/config/environments/environment.ts` (не хардкодить).
- **`errorInterceptor` для GET сам показывает алерт и возвращает `EMPTY`** — `catchError` в компоненте алерт не отменит. Для запросов, доступных не всем: `new HttpContext().set(SKIP_ERROR_ALERT, true)` **плюс** гейт по праву до подписки (нужны оба слоя).
- Ошибки пользователю — через `NotificationService` (TuiAlertService). Отмены/перезапросы: `switchMap`, `takeUntilDestroyed`.
- Модель ошибок бэкенда: `google.rpc.Status` (400 INVALID_ARGUMENT, 401, 403 PERMISSION_DENIED, 404, 409, 412 FAILED_PRECONDITION, 500).

## 8. Контракт поселений (частые ловушки)

- `GET .../roles` и `GET .../members` **не существуют**: роли/состав — только внутри `Settlement`; мутации возвращают `{ settlement }` → перерисовка из ответа мутации, без дозапроса.
- `Settlement.leader` — `@deprecated`; владельцы = члены с `role_ids` содержащими `'owner'` (`OWNER_ROLE_ID`); `members` **уже включают владельцев** — никаких `members.length + 1`.
- Обязательные поля тела в мутациях ролей/владения/контактов — без них `INVALID_ARGUMENT`.
- `role.name` и `contact_info` выводить **только интерполяцией `{{ }}`** (сервер не экранирует — XSS); валидация на клиенте: имя роли 1–64, контакты ≤512, запрет `<` `>`.
- «Гильдия» — фронтовый костыль: маркер `[GUILD]` в `name`, режется хелперами `entities/settlement/lib/` (`is-guild-*`, `get-settlement-display-name`, pipe `settlement-display-name`); на бэк уходит `type: 'CAMP'`; шкала уровней и кнопка повышения гильдии не показываются.
- Чтение `attachments[0].url` — только с optional chaining (бывают пустые вложения).
- Гейтинг кнопок: инвайты `owner ∨ PERMISSION_INVITE_MEMBER`; заявки `owner ∨ PERMISSION_REVIEW_JOIN_REQUEST`; роли/контакты/владение/картинка/уровень — только `isOwner`; кик — `isOwner ∨ admin`; выход — не-owner (или owner при втором владельце). Чистые функции гейтинга покрыты тестами — менять с оглядкой.

## 9. SEO / a11y / роутинг

- SEO через `SeoService` — реальный путь `src/app/core/services/seo.service.ts` (⚠️ AGENTS.md указывает устаревший `src/app/services/`). Ключи: `src/app/routes/enums/route-keys.ts`, данные: `src/app/routes/seo-data.ts`.
- Каждая страница: ровно один `<h1>`, семантические теги, alt у изображений, контраст WCAG AA, клавиатурная доступность (кликабельные `div` → `button`).
- Роуты — lazy (`loadComponent`), ленивые словари через `loadPage()`; тяжёлые виджеты — `@defer (on idle)`; новый пререндер-роут → добавить в `routes.txt`.
- Тестовый/дефолтный роут 404 — атмосферная сцена `features/not-found/` (слушатели — в `afterNextRender` + `runOutsideAngular`).

## 10. Расхождения AGENTS.md ↔ реальность (проверено по коду)

| AGENTS.md говорит | На самом деле |
|---|---|
| `src/app/pages/*`, `src/app/widgets/*` | каталогов нет; страницы в `features/*` |
| alias `@widgets/*` «добавлять» | отсутствует в tsconfig |
| `src/app/services/seo.service.ts` | `src/app/core/services/seo.service.ts` |
| `src/app/styles/variables.less` | `src/app/shared/styles/variables.less` |
| Секреты/прокси Discord | удалены (PROJECT_MAP §3.7–3.8, §4): всё через бэкенд `vsservice`, `entities/discord/api/discord.api.ts` |

**Вывод для агента:** AGENTS.md — целевая конституция, PROJECT_MAP.md — фактическая летопись. При противоречии верить коду и PROJECT_MAP.md, пути проверять glob'ом.

## 11. Порядок работы над задачей

1. Определить слой FSD; открыть `PROJECT_MAP.md` (раздел 3 — летопись изменений с обоснованиями) и `index.ts` слайса.
2. Новые тексты → обе локали + `check-i18n.mjs`; новые цвета → токены + `check-contrast.mjs`.
3. Создал/перенёс файлы → обновить `PROJECT_MAP.md` (раздел 3, свежие записи сверху с нумерацией `3.-N`) и эту карту при смене правил.
4. Проверка: `npm run build` (бюджеты!). Известная нестабильность: пререндер `/unauthorized` иногда падает с `TimeoutError` — воспроизводится на чистом `main`, не является регрессией.
5. Коммиты в стиле `LH | feat: ...`. Ветка `design/slop-archive` — не мержить, только копировать приёмы.

## 12. Скрипты и команды

- `npm start` — dev-сервер на 127.0.0.1:4200 (через dotenv).
- `npm run build` — прод-сборка с пререндером; `npm run watch`; `npm test` — Karma+Jasmine.
- `node scripts/check-contrast.mjs`, `node scripts/check-i18n.mjs <файл>`.
- Контракт API: `API_CONTRACT.md` (942 строки) + живая спека `https://docs.lasthearth.ru/v1/openapi.yaml`.
