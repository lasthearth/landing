# PROJECT_MAP.md — переехал

| Что нужно | Где смотреть |
|---|---|
| `.lh-panel` | базовая контентная панель. Рамка — внутренняя тень, а не `border`, поэтому не влияет на размеры блока. Заменила 58 дублей `bg-lh-primary-2/10 + border + rounded-2xl + p-6 + инлайновая тень` в 15 шаблонах |
| `.lh-panel--bezel` + `.lh-panel__core` | двойная фаска: панель становится оправой, её падинг — зазором рамки, содержимое переносится в ядро. Радиус ядра = `calc(var(--lh-panel-radius) - var(--lh-panel-gap))`, иначе контуры перестают быть концентрическими |
| `.lh-shadow` | мягкая слоистая тень для статики. Ховер-версию задавать явно |
| `.lh-card-glow` | брендовое свечение рамки на ховере |

Локальные исключения (обоснованы в комментариях): `.welcome-bezel` / `.welcome-card` —
на видеокадре карточка стеклянная, а общая утилита подмешивает чернила и `surface-2`,
давая мутную плашку.

### 6.3.3 Компоненты

| Класс | Файл | Заметки |
|---|---|---|
| `.nav-button`, `.nav-button--active` | `src/styles.css` | хедер, футер, навигация профиля, стрелки карусели. Ховер-лифт 1px, просадка `scale(0.95)` @80ms. Активный раздел — брендовый градиент вместо инверсии в пергамент (инверсия давала белую кнопку в тёмном ряду). Перекрытие тёмной темы сужено до `:not(.nav-button--active)` — поэтому без `!important` |
| `.lh-cta`, `.lh-cta__icon`, `--telegram`, `--ghost` | `src/styles.css` | пилюля с вложенной иконкой-кругом; круг сдвигается на ховере, задавая направление действия |
| `.lh-reveal` + `RevealDirective` | `src/styles.css`, `shared/lib/directives/` | `[appReveal]`, `[appRevealDelay]`, `[appRevealThreshold]`. Единственный механизм появления при прокрутке. Учитывает пререндер: на сервере `is-visible` ставится сразу, при гидратации сбрасывается только у блоков ниже сгиба |
| `.pulse-card` | `home.component.less` | карточка метрики на `.lh-panel--bezel`; в компоненте остались только ховер и медальон иконки |
| `.welcome-stagger` | `welcome.component.css` | каскад по таймеру, а не `appReveal`: экран открывается целиком во вьюпорте, наблюдать за пересечением нечего |
| `.lh-display` | `src/styles.css` | Almendra. **Один `h1` на страницу плюс заголовки секций, кегль от `text-2xl`.** На абзацах и подписях запрещён: теряется контраст с Advent Pro |
| `.lh-tag` | `src/styles.css` | тег поселения; произвольный цвет с бэкенда читаем в обеих темах через `color-mix` |
| `.lh-scroll-top` | `src/styles.css` | кнопка «наверх» на rules / FAQ / оферте / политике. Позиция привязана к плавающей кнопке чата (`game-chat-widget.component.less`): кнопка стоит слева от неё в том же ряду. Раньше обе стояли в одной точке `bottom-6 right-6` с одним слоем, и чат (позже в DOM) перекрывал кнопку |

### 6.3.4 Отброшено

| Приём | Причина |
|---|---|
| `.lh-eyebrow` | кикер-пилюля над каждым вторым заголовком — типовой AI-тик |
| Декоративные цифры шагов `text-8xl opacity-40` | в `start-game` заменены на `<ol>` + `counter()`: порядок задан структурой, скринридер объявляет нумерацию сам |
| `blur()` в четырёх механизмах появления | сведено к одному `.lh-reveal`, без размытия |
| Каскад пунктов внутри `.dropdown-enter` | 8 пунктов по 50ms открывались дольше самого меню |
| `scale(103%)` на ховере карточек магазина | замыливало текст на субпиксельном рендере; заменено на подъём |
| `.lh-bezel` как отдельный класс | стал модификатором `.lh-panel--bezel` |

### 6.3.5 Доступность и проверки

- `node scripts/check-contrast.mjs` — все пары токенов проходят WCAG AA.
- Заголовки страниц `rules` / `faq` / `market` / `start-game` были `<p>` — заменены
  на `<h1>`: страница без `h1` ломает обход по заголовкам и SEO.
- Все анимации имеют ветку `prefers-reduced-motion: reduce`.

## 7. Последний коммит

- `LH | feat: add diplomacy, gallery, videos, game chat, radio widget; remove secrets from configs`
- Сборка: `npm run build` проходит, 11 prerender-роутов.

### 7.0 Оптимизация бандла и загрузки

> Начальный бандл сокращён с ~2.66 MB (raw) / бюджет не проходил до ~1.25 MB raw
> (~257 kB gzip). `public/` уменьшен с ~50 MB до ~4.8 MB.

- **Роуты ленивые** (`routes/app.routes.ts`): все страницы через `loadComponent`
  (были статические `import`). Правила, юр-страницы и админка больше не в
  начальном чанке.
- **Ленивые словари i18n**: `translations/index.ts` грузит только общие словари
  (common/header/footer/shared/ticket/news). Остальные (`rules` 224 kB,
  `legal` 64 kB, `admin`, `market`, ...) подмешиваются вместе со страницей через
  `loadPage()` (`core/i18n/lib/load-page.function.ts`) в реестр
  `translations/registry.ts` (`TRANSLATIONS` + `registerTranslations`).
  `ALL_TRANSLATIONS` переименован в `TRANSLATIONS`.
- **Удалённые зависимости**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  (не использовались — загрузка идёт через presigned POST + `fetch`),
  `@taiga-ui/addon-charts`, `@taiga-ui/addon-doc`, `@angular/platform-browser-dynamic`.
- **`@defer (on idle)`**: игровой чат (`layout.component.html`) и радио
  (`landing.component.html`) выведены из начального рендера.
- **Радио не грузит YouTube по умолчанию** (`radio-widget.component.ts`):
  конструктор больше не создаёт iframe и не тянет `iframe_api` (>1 MB чужого JS +
  запросы к doubleclick). Плеер создаётся при первом нажатии play.
- **Опрос Discord останавливается на скрытой вкладке** (`game-chat.service.ts`,
  `visibleTimer$` по `visibilitychange`).
- **Изображения**:
  - `welcome-video.mp4` 24 MB → 2.8 MB (720p/30fps, без звука, `+faststart`).
  - `public/team/*` PNG (~10.5 MB) → webp 512px (~0.28 MB); `default-avatar`,
    `splinter-of-spark` → webp; `7.png` → `7.webp`. Ссылки в шаблонах и
    `environment*.ts` обновлены.
  - Пережаты крупные webp (`br`, `3`, `1`, `4`, `castle-recruit`,
    `landing-carousel/4-6`), `images/logo.png`.
  - Удалены неиспользуемые: `5/8/9/10.png`, `br.jpg`, `s.jpg/webp`, `ava.jpg`,
    `images/news_1.webp`, `images/logo.webp`, битая ссылка `old-paper.webp`
    (правило `.old-paper-background` удалено из `styles.css` и
    `rules.component.less`).
  - `ImageLoaderComponent` получил вход `eager` (по умолчанию `loading="lazy"`,
    `decoding="async"`; на первом слайде карусели — `eager`+`fetchpriority=high`).
- **Шрифты**: убраны italic-начертания из Google Fonts в `index.html` (в проекте
  курсив не используется) — меньше `@font-face` и woff2-загрузок.
- **nginx.conf**: gzip + `Cache-Control immutable` для хешированных js/css,
  30d для статики, `no-cache` для html.
- **Бюджеты** (`angular.json`): initial warning 1.4 MB / error 1.8 MB.
- Проверено Playwright: все 13 роутов рендерят контент (переводы, картинки,
  скриншот-стрип из Discord грузятся), непереведённых ключей и битых картинок нет.

### 7.1 Ветки

| Ветка | Содержимое |
|---|---|
| `design/keep-approved` | дизайн-система 6.3, внедрена заново поверх чистого `main`. Влита в `main` |
| `design/slop-archive` | архив прогона `high-end-visual-design` целиком. Не мержить, только копировать куски |
| `feat/settlement-roles-ownership` | owner-модель, роли и заявки. **Влита** в `feat/settlement-management` |
| `feat/settlement-management` | текущая: управление ролями, заявками, владением, контактами, админская вкладка (раздел 3.-5) |

## 8. TODO для следующей сессии

- [x] Смержить `feat/settlement-roles-ownership` (owner-модель, роли, заявки).
- [ ] Проверить `feat/settlement-management` на dev-стенде: гейтинг прав у
      обычного жителя (не должно быть ни одного попапа), матрица прав в тёмной
      теме и на мобильном, лимит активных заявок (число знает только бэкенд).
- [x] Прогон сборки нестабилен: `ng build` иногда падал на пререндере
      `/unauthorized` с `TimeoutError`. Причина: `/unauthorized` — роут-редирект
      (`redirectTo: '/home'`), его пререндер бессмысленен (nginx всё равно
      отдаёт index.html, клиентский роутер сам редиректит), а SSR-рендер
      редиректа ждёт завершения второй навигации и периодически не успевал
      к таймауту. Роут мёртвый — гарды шлют на `/home`. Убран из `routes.txt`
      (11 → 10 роутов), 4 контрольных прогона сборки — стабильно.
- [ ] Проверить дизайн-систему в браузере: тёмная тема, `prefers-reduced-motion`, автоплей видео в Firefox / Zen.
- [ ] Сгенерировать proto-заглушки и goverter-мапперы в `vsservice` (`make proto && make generate`).
- [ ] Проверить сборку и линтер `vsservice` (`make lint && make test && make build`).
- [ ] Проверить интеграцию фронтенд ↔ бэкенд на dev-стенде.
