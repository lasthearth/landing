# AGENTS.md — Конституция проекта Last Hearth Landing

> **Для агентов:** перед любыми изменениями изучите `PROJECT_MAP.md` — он содержит точную навигацию по проекту и экономит токены на поиск файлов.

---

## 1. Общие сведения

| Параметр | Значение |
|----------|----------|
| **Название** | Last Hearth Landing |
| **Фреймворк** | Angular 20 (standalone components) |
| **Сборщик** | `@angular/build:application` (Vite-based) |
| **Язык** | TypeScript 5.9 (strict mode) |
| **Стили** | LESS (основной) + Tailwind CSS v4 + PostCSS |
| **UI Kit** | Taiga UI 4.x (core, kit, addon-charts, addon-commerce, addon-mobile, layout) |
| **Аутентификация** | OIDC через `angular-auth-oidc-client` + Logto |
| **HTTP** | `HttpClient` с `fetch`-backend + `authInterceptor` |
| **Хранилище** | `localStorage` (обёртка в `LocalStorageService`) |
| **State** | Сервис-ориентированный подход (без NgRx) |

---

## 2. Архитектура: Feature-Sliced Design (FSD)

Проект постепенно мигрирует на **FSD**. Весь новый код пишется по FSD. Легаси-структура документирована в `PROJECT_MAP.md`.

### 2.1 Слои (сверху вниз — от запрещённых зависимостей к разрешённым)

```
app/          → pages/        → widgets/      → features/     → entities/     → shared/
(инициализация) (страницы)     (композиция)    (бизнес-логика) (бизнес-сущности) (переиспользование)
```

**Правило импортов:** верхний слой может импортировать только нижние слои. Нижний слой **НИКОГДА** не импортирует верхний.

### 2.2 Структура слоёв

```text
src/app/
├── app.config.ts              # глобальная конфигурация приложения
├── app.component.*            # корневой layout
├── app.routes.ts              # корневые роуты (lazy-loaded)
│
├── pages/                     # [СЛОЙ] Страницы, маппятся 1:1 на роуты
│   ├── home/
│   ├── rules/
│   ├── market/
│   ├── profile/
│   ├── settlements/
│   ├── start-game/
│   ├── privacy-policy/
│   ├── public-offer/
│   ├── faq/
│   └── landing/
│
├── widgets/                   # [СЛОЙ] Композиционные блоки из фич
│   ├── header/
│   ├── footer/
│   ├── rule-section/
│   ├── settlement-card/
│   └── news-card/
│
├── features/                  # [СЛОЙ] Бизнес-фичи (use-case driven)
│   ├── auth/
│   ├── market/
│   ├── rules/
│   ├── settlements/
│   ├── news/
│   ├── admin/
│   └── verification/
│
├── entities/                  # [СЛОЙ] Бизнес-сущности
│   ├── user/
│   ├── settlement/
│   ├── player/
│   └── news/
│
└── shared/                    # [СЛОЙ] Переиспользуемые модули
    ├── ui/                    # dumb components (кнопки, инпуты, хинты)
    ├── lib/                   # utils, helpers, pipes
    ├── api/                   # base API client, interceptors
    ├── config/                # конфигурация, environment
    ├── types/                 # глобальные типы
    └── styles/                # переменные, миксины, глобальные стили
```

### 2.3 Сегменты внутри слайса

Каждый слайс (папка в слое) может содержать:

```text
feature-name/
├── index.ts              # публичный API слайса (только он импортируется снаружи!)
├── ui/                   # компоненты
├── model/                # типы, интерфейсы, state-сервисы
├── api/                  # сервисы для работы с бэкендом
├── lib/                  # вспомогательные функции
└── config/               # константы, конфигурация фичи
```

**ЗАПРЕЩЕНО** импортировать из внутренних файлов слайса — только через `index.ts`.

---

## 3. Соглашения по коду

### 3.1 Компоненты

- **Только standalone** компоненты. `NgModule` — легаси, не создавать новые.
- **Префикс:** `app` (установлен в `angular.json`).
- **Change Detection:** предпочтительно `ChangeDetectionStrategy.OnPush` для всех новых компонентов.
- **Файлы компонента:**
  ```text
  my-component/
  ├── my-component.component.ts
  ├── my-component.component.html
  ├── my-component.component.less
  └── my-component.component.spec.ts   # пока не пишем тесты, но файл оставляем placeholder
  ```
- **Именование классов:** `MyComponent` (PascalCase).
- **Селекторы:** `app-my-component` (kebab-case с префиксом `app`).

### 3.2 Сервисы

- Injectable с `providedIn: 'root'` по умолчанию.
- Фичевые сервисы можно ограничивать через `providedIn` компонента, если есть состояние.
- Нейминг: `*Service` для API/бизнес-логики, `*Store` для state-хранилища.

### 3.3 Path Aliases (tsconfig.json)

```json
{
  "@app/*": ["./src/app/*"],
  "@routes/*": ["./src/app/routes/*"],
  "@layout/*": ["./src/app/layout/*"],
  "@core/*": ["./src/app/core/*"],
  "@shared/*": ["./src/app/shared/*"],
  "@entities/*": ["./src/app/entities/*"],
  "@features/*": ["./src/app/features/*"],
  "@pages/*": ["./src/app/pages/*"]
}
```

**Правило:** при создании нового слайса в FSD добавлять alias `@features/*`, `@entities/*`, `@shared/*`, `@widgets/*`, `@pages/*`.

### 3.4 Файл = строго 1 сущность

- **ОДИН файл содержит РОВНО ОДНУ сущность:** один класс, один интерфейс, один тип, одна функция, одна константа.
- **ЗАПРЕЩЕНО** комбинировать в одном файле: класс + интерфейс, сервис + компонент, несколько интерфейсов, несколько функций.
- Каждая сущность — отдельный файл с именем, совпадающим с именем сущности (kebab-case для файла, PascalCase для класса).
- Исключение: вспомогательные типы, строго привязанные к одной сущности (например, `NewsCardProps` для `NewsCardComponent`) — допускаются в том же файле, но только если не используются за его пределами. Если используются — вынести в отдельный файл.

### 3.5 JSDoc: многострочная документация

**Каждый** публичный элемент кода обязан иметь многострочный JSDoc-комментарий:

```typescript
/**
 * Компонент карточки новости.
 * Отображает заголовок, содержание, превью и дату публикации.
 */
@Component({...})
export class NewsCardComponent {
    /**
     * Данные новости для отображения.
     * Содержит отформатированные поля: title, content, preview, formattedDate.
     */
    public readonly news = input.required<News>();

    /**
     * Открывает подробный просмотр новости.
     * Эмитит ID новости при клике на карточку.
     */
    public readonly openDetails = output<string>();

    /**
     * Форматирует дату в локальный формат.
     * @param date Исходная дата в формате ISO 8601.
     * @returns Строка в формате "DD.MM.YY - HH:mm".
     */
    private formatDate(date: Date): string {
        ...
    }
}
```

**Правила:**
- Каждый **класс/интерфейс/тип/enum** — описание назначения (минимум 1 строка).
- Каждое **публичное поле** — описание, что содержит, зачем нужно.
- Каждый **метод** — описание, `@param` для каждого параметра, `@returns` если есть возврат.
- Каждая **функция** (включая стрелочные) — описание, `@param`, `@returns`.
- Приватные методы/поля — тоже документировать, если логика нетривиальная.
- Комментарии пишутся **на русском** (проект русскоязычный).

### 3.6 Импорты

Внутри файла группировать импорты:

1. Angular core / common
2. RxJS
3. Сторонние библиотеки (Taiga UI, OIDC и т.д.)
4. Path aliases проекта (`@shared/`, `@entities/` и т.д.)
5. Относительные импорты (только внутри одного слайса)

---

## 4. Стили

### 4.1 Технологический стек

- **Tailwind CSS v4** — утилитарные классы для layout, spacing, flex/grid.
- **LESS** — кастомные компонентные стили, переменные, миксины.
- **Taiga UI** — темизация через `taiga-ui-theme.less`.

### 4.2 Правила

- Глобальные переменные: `src/app/styles/variables.less`.
- Глобальные appearances: `src/app/styles/appearances/`.
- Компонентные стили пишутся в `.less` файле компонента.
- Tailwind используется для быстрого прототипирования layout.
- **ЗАПРЕЩЕНО** писать глубокие селекторы вроде `.parent .child .grandchild { ... }`. Максимум 2 уровня вложенности.
- **ЗАПРЕЩЕНО** использовать `!important` без комментария-обоснования.

---

## 5. Работа с API

> **Полный контракт:** см. `API_CONTRACT.md` — все эндпоинты, схемы, коды ошибок и маппинг на фронтенд-сервисы.

### 5.1 Общие правила

- Базовый URL API конфигурируется в `environment.ts`.
- Все HTTP-запросы проходят через `authInterceptor`.
- API-сервисы группируются по доменам: `UserService`, `SettlementService`, `NewsService` и т.д.
- Обработка ошибок: через `NotificationService` (Taiga UI `TuiAlertService`).
- Повторные запросы и отмены: использовать `switchMap` / `takeUntilDestroyed`.

### 5.2 Типы

- Все DTO и интерфейсы бэкенда хранятся рядом с API-сервисами (в `entities/*/model/` или `features/*/model/`).
- Префикс для интерфейсов: `I` (наследие проекта) — для нового кода можно без префикса.

---

## 6. SEO и Accessibility

### 6.1 SEO

- Для каждой страницы обязательно задание мета-тегов через `SeoService` (`src/app/services/seo.service.ts`).
- `RouteKeys` в `src/app/routes/enums/route-keys.ts` — единый источник truth для SEO-ключей.
- Title и description задаются в `data` роута или через `SeoService.setMeta()`.
- Open Graph теги для шаринга в соцсетях.

### 6.2 Accessibility (a11y)

- Семантический HTML: `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`.
- Все интерактивные элементы должны быть доступны с клавиатуры.
- Alt-тексты для изображений (особенно в `public/`).
- ARIA-атрибуты только при необходимости (предпочитать семантику).
- Цветовой контраст WCAG AA минимум.

---

## 7. Lazy Loading

- Страницы (`pages/`) загружаются через `loadComponent` / `loadChildren`.
- Тяжёлые фичи (market, rules, settlements) — lazy-loaded.
- Лёгкие shared-компоненты можно импортировать напрямую.

Пример:
```typescript
{
  path: 'market',
  loadComponent: () => import('@pages/market').then(m => m.MarketPageComponent),
}
```

---

## 8. Запрещённые практики

- ❌ Создавать новые `NgModule`.
- ❌ Импортировать из внутренних файлов другого слайса (только `index.ts`).
- ❌ Использовать `any` без крайней необходимости (strict mode включён).
- ❌ Писать бизнес-логику в компонентах — выносить в сервисы/сторы.
- ❌ Хардкодить URL API в компонентах — использовать `environment.ts`.
- ❌ Дублировать типы — создавать shared types.
- ❌ Использовать `console.log` в production-коде (только `console.error` для критических ошибок).
- ❌ Модифицировать файлы в `node_modules/` или `dist/`.

---

## 9. Порядок работы агента

1. **Изучить задачу** и определить, какой слой FSD затронут.
2. **Открыть `PROJECT_MAP.md`** — найти существующие файлы и зависимости.
3. **Проверить `index.ts`** затронутого слайса — понять публичный API.
4. **Вносить изменения** согласно слоистой архитектуре.
5. **Обновить `PROJECT_MAP.md`** при создании/переносе файлов.
6. **Проверить сборку:** `npm run build`.

---

## 10. Документация и контакты

- `README.md` — краткое описание проекта (wiki-раздел).
- `PROJECT_MAP.md` — навигация по файлам и зависимостям.
- `API_CONTRACT.md` — бэкенд-контракт (эндпоинты, схемы, ошибки).
