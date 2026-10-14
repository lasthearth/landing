# Архитектура

> **Что это.** Слои, границы и порядок работы. Проверяется кодом: `npm run arch`.
> Летопись решений и отказов — `docs/history.md`, открытый техдолг — `docs/TODO.md`.

## Слои

Импорт разрешён только **вниз** (и внутри своего слоя):

```text
app / routes     — инициализация, роуты, гварды
  layout         — каркас страницы: шапка, подвал, фон
    features     — фичи и страницы (сегодня страницы живут здесь)
      entities   — бизнес-сущности и их API
        shared   — переиспользуемый код без знания о домене
core             — сквозной слой: инфраструктура (i18n, interceptors, config, guards)
```

- `src/app/features/*` — и каталог фичи, и каталог страницы. Каталогов `pages/` и `widgets/` в проекте нет.
- `core` — сквозной слой: ему позволено знать про `entities` и `features` (иначе проверка давала бы ложные ошибки).
- `shared` обязан оставаться бездоменным: импорт из `entities`/`features` — нарушение.

## Слайс

```text
features/market/
├── index.ts      — публичный API: только отсюда импортируют другие слайсы
├── ui/ model/ api/ lib/ config/   — сегменты (набор свободный)
```

- Проверка `missingBarrel`: если у слайса есть сегменты, `index.ts` обязателен.
- Проверка `deepImport`: импорт вида `@features/market/ui/...` извне слайса — ошибка; нужен `@features/market`.
- Барабаны сначала генерировались по фактическим потребителям; курируемые (написанные руками) не перезаписываются.
  Перегенерировать можно логикой из `docs/history.md` §3.-N или вручную.

## Правила кода

| Правило                                                                                   | Проверка                          |
| ----------------------------------------------------------------------------------------- | --------------------------------- |
| 1 файл = 1 сущность (класс, интерфейс, тип, функция, константа)                           | ревью                             |
| Только standalone-компоненты; `NgModule` не создавать                                     | ревью                             |
| `ChangeDetectionStrategy.OnPush` у всех новых компонентов                                 | ревью                             |
| Файлы компонента: `x.component.{ts,html,less,spec.ts}`, префикс `App`… → селектор `app-x` | ревью                             |
| JSDoc на русском у каждого публичного элемента: назначение, `@param`, `@returns`          | ревью                             |
| Порядок импортов: Angular → RxJS → сторонние → `@alias` → относительные                   | `npm run format:check`            |
| Бизнес-логика — в сервисах/сторах, не в компонентах                                       | ревью                             |
| `any` и `console.log` в проде запрещены                                                   | ревью (ESLint — в `docs/TODO.md`) |
| Сервисы: `providedIn: 'root'`; нейминг `*Service` (API/логика), `*Store` (состояние)      | ревью                             |

## Роуты

- Все страницы — ленивые (`loadComponent`) и подтягивают свой словарь через `loadPage()` (см. `docs/I18N.md`).
- Тяжёлые виджеты — `@defer (on idle)`.
- Новый роут → режим рендера в `src/app/app.routes.server.ts` (`RenderMode.Prerender`/`Server`/`Client`); таблица роутов — `docs/project-map.md`.
- SEO: `SeoService` (`src/app/core/services/seo.service.ts`), ключи — `src/app/routes/enums/route-keys.ts`, данные — `src/app/routes/seo-data.ts`.

## Как добавить страницу

1. `features/<name>/` + компонент `<name>.component.ts` (+ html, less).
2. Словарь `core/i18n/translations/features/<name>.i18n.ts` в двух локалях.
3. Роут в `src/app/routes/app.routes.ts`: `loadComponent` + `loadPage` + `data: { route_keys, seo }`.
4. Ключ в `route-keys.ts`, метаданные в `seo-data.ts`, режим рендера в `app.routes.server.ts`.
5. `npm run map` — карта навигации обновится сама.
