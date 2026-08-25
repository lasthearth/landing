# PROJECT_MAP.md — Last Hearth Landing

## 1. Общее

- Фреймворк: Angular 20 (standalone components, signals).
- Сборщик: `@angular/build:application` (Vite-based).
- Стили: LESS + Tailwind CSS v4.
- UI Kit: Taiga UI 4.x.
- i18n: кастомный сервис `@core/i18n` с pipe `translate`.
- Архитектура: миграция на FSD (Feature-Sliced Design).

## 2. Слои FSD

```text
src/app/
├── app.config.ts / app.component.* / app.routes.ts
├── pages/        — страницы, lazy-loaded
├── widgets/      — композиционные блоки
├── features/     — бизнес-фичи
├── entities/     — бизнес-сущности
└── shared/       — переиспользуемый код
```

## 3. Недавние крупные изменения

### 3.-1 Роли, owner-модель и заявки на вступление в поселения

> `Settlement.leader` deprecated. Лидеры теперь — члены с `role_ids`, содержащими `"owner"` (их может быть несколько). Добавлены роли, права, заявки на вступление, передача владения, контакты.

- Модель (`entities/settlement/model/`):
  - `permission.ts` — enum `Permission` (`PERMISSION_INVITE_MEMBER`, `PERMISSION_REVIEW_JOIN_REQUEST`).
  - `i-role.ts` — `IRole { id, name, permissions[] }`.
  - `i-join-request.ts` — `IJoinRequest`.
  - `i-member.ts` — добавлено `role_ids?: string[]`.
  - `i-settlement.ts` — добавлены `roles?`, `roles_enabled?`, `contact_info?`; `leader?` помечен `@deprecated`.
- Хелперы (`entities/settlement/lib/`):
  - `owner-role-id.constant.ts` — `OWNER_ROLE_ID = 'owner'`.
  - `get-owner-ids.function.ts` — `getOwnerIds(settlement)`.
  - `is-owner.function.ts` — `isOwner(settlement, userId)`.
  - `member-has-permission.function.ts` — `memberHasPermission(settlement, userId, permission)` (owner = все права; при `roles_enabled=false` только owner).
- API (`entities/settlement/api/settlement.service.ts`): `createJoinRequest$`, `cancelJoinRequest$`, `getMyJoinRequests$`, `getJoinRequests$`, `approveJoinRequest$`, `rejectJoinRequest$`, `createRole$`, `updateRole$`, `deleteRole$`, `assignMemberRole$`, `removeMemberRole$`, `transferOwnership$`, `leaveSettlement$`, `updateContactInfo$`, `adminAddOwner$`, `adminRemoveOwner$`, `adminSetRolesEnabled$`, `adminDeleteSettlement$`.
- UI-потребители переведены с `.leader` на owner-модель: `settlements.component`, `settlement-card`, `settlement-detailed`, `features/settlements/settlement`, `features/profile`.
  - Кнопки гейтятся: инвайты по `canInvite` (`PERMISSION_INVITE_MEMBER`/owner), уровень/редактирование/картинка — по `isOwner`, выход — не-owner.
  - Бейджи ролей члена — `getMemberRoleNames`, скрыты при `roles_enabled=false`.
  - `contact_info` и `role.name` выводятся ТОЛЬКО интерполяцией `{{ }}` (XSS: сервер не экранирует).
  - Счётчики жителей: `members.length` (owner теперь внутри `members`, не `+1`).

### 3.0 Единый бейдж поселения

> Плашки типа селения / населения / онлайна / дипломатии были разными в списке селений и в профиле. Вынесены в один компонент.

- Файлы:
  - `src/app/entities/settlement/ui/settlement-badge/settlement-badge.component.ts` — `app-settlement-badge`, входы `tone`, `uppercase`, `icon`.
  - `src/app/entities/settlement/model/settlement-badge-tone.ts` — тип `SettlementBadgeTone`.
  - `src/app/entities/settlement/lib/get-settlement-type-tone.function.ts` — тон по tier селения.
  - `src/app/entities/settlement/lib/get-diplomacy-tone.function.ts` — тон по статусу дипломатии.
  - `src/app/entities/settlement-tag/ui/settlement-tag/settlement-tag.component.{ts,html}` — перенесён из `features/admin/moderate-settlement-request/`, экспортируется из `@entities/settlement-tag`.
- Потребители: `settlement-card`, `settlement-detailed`, `features/settlements/settlement`, `features/profile`.
- Удалён `entities/settlement/ui/guild-badge` — нигде не использовался.

### 3.1 Костыль: основание гильдии через маркер в названии селения

> Бэкенд не знает про тип «гильдия». На фронте реализован маркер `[GUILD]`, который прячется в `name` селения и вырезается при отображении.

- Файлы:
  - `src/app/entities/settlement/lib/guild-marker.constant.ts`
  - `src/app/entities/settlement/lib/is-guild-settlement.function.ts`
  - `src/app/entities/settlement/lib/is-guild-name.function.ts`
  - `src/app/entities/settlement/lib/get-settlement-display-name.function.ts`
  - `src/app/entities/settlement/lib/build-guild-name.function.ts`
  - `src/app/entities/settlement/ui/settlement-display-name.pipe.ts`
  - `src/app/entities/settlement/model/settlement-types.ts`
  - `src/app/features/profile/create-settlement-from/settlements-types-forms/guild-form/guild-form.component.{ts,html}`
  - `src/app/features/profile/create-settlement-from/settlements-types-forms/guild-form/model/guild-form-data.ts`
  - `src/app/features/profile/create-settlement-from/settlements-types-forms/guild-form/lib/guild-form-fields.ts`
  - `src/app/features/profile/create-settlement-from/create-settlement-from.component.ts`
  - `src/app/features/profile/pages/settlement/settlement.component.{ts,html}`
  - `src/app/features/profile/pages/settlement/edit-settlement-form/edit-settlement-form.component.ts`
  - `src/app/widgets/settlement-card/settlement-card.component.{ts,html}`
  - `src/app/widgets/settlement-detailed/settlement-detailed.component.{ts,html}`
  - `src/app/pages/settlements/settlements.component.{ts,html}`
  - `src/app/features/admin/settlement-verification-request/settlement-verification-request.component.{ts,html}`
- Функционал:
  - Маркер `[GUILD]` в начале названия селения скрывается при выводе.
  - Для гильдий показывается бейдж «Гильдия» и тип «Гильдия» вместо «Лагерь».
  - Добавлена отдельная форма создания гильдии; на бэкенд шлётся `type: 'CAMP'` с именем, начинающимся на `[GUILD]`.
  - Кнопка «Повысить уровень» скрыта для гильдий (гильдия не имеет уровней).
  - Переводы добавлены в `settlements.i18n.ts` и `admin.i18n.ts` (ru/en).

### 3.2 Галерея скриншотов (`/gallery`)
- Файлы:
  - `src/app/features/gallery/gallery.component.{ts,html,css}`
  - `src/app/features/gallery/ui/gallery-image/`
  - `src/app/shared/lib/discord-gallery/discord-gallery.service.ts`
  - `src/app/core/i18n/translations/features/gallery.i18n.ts`
- Функционал:
  - Загрузка скриншотов из Discord-канала.
  - Lazy loading изображений (placeholder + blur-up).
  - Скелетоны, бейдж «Новое», пагинация при скролле.
  - Кэширование в localStorage.

### 3.2 Видео (`/videos`)
- Файлы:
  - `src/app/features/videos/ui/videos-page/`
  - `src/app/features/videos/ui/video-card/`
  - `src/app/features/videos/api/youtube.service.ts`
  - `src/app/features/videos/config/youtube-config.ts`
  - `src/app/features/videos/lib/safe-url.pipe.ts`
- Функционал:
  - YouTube Data API v3, плейлист канала `@LISOVCORP`.
  - Единообразные карточки видео.

### 3.3 Дипломатия (`/diplomacy`)
- Файлы:
  - `src/app/features/diplomacy/diplomacy-page.component.{ts,html,css}`
  - `src/app/core/i18n/translations/features/diplomacy.i18n.ts`
- Функционал:
  - Заявления глав селений из Discord-канала дипломатии.
  - Стилизованные карточки-пергаменты.
  - Очистка Markdown-разметки из Discord.

### 3.4 Игровой чат (плавающий виджет)
- Файлы:
  - `src/app/features/game-chat/ui/game-chat-widget/`
  - `src/app/features/game-chat/services/game-chat.service.ts`
  - `src/app/features/game-chat/model/game-chat-message.ts`
  - `src/app/features/game-chat/lib/discord-emoji.ts`
- Функционал:
  - Старые сообщения сверху, свежие снизу.
  - Автоскролл, бейдж непрочитанных, звук (можно отключить).
  - Периодический polling, кэширование.

### 3.5 Радио-виджет
- Файлы:
  - `src/app/features/radio-widget/ui/radio-widget/`
  - `src/app/features/radio-widget/config/lofi-stations.ts`
- Функционал:
  - YouTube-стримы (lo-fi и другие).
  - Воспроизведение, остановка, громкость, свёрнутый режим.

### 3.6 Навигация и layout

- `src/app/layout/header/header.component.{ts,html}` — Дипломатия вынесена в отдельную кнопку рядом с Селениями; Галерея + Видео в меню «Медиа».
- `src/app/layout/layout.component.{ts,html}` — убран плавающий FAB тикета.
- `src/app/features/profile/profile-navigation/` — тикет добавлен в навигацию профиля.
- `src/app/features/home/home.component.{ts,html,less}` — в быстрых действиях добавлена Галерея, убрано Видео.

### 3.7 Discord-прокси на бэкенде (vsservice)

- Файлы:
  - `vsservice/proto/discord/v1/discord.proto`
  - `vsservice/internal/discord/fx.go`
  - `vsservice/internal/discord/internal/discord/client.go`
  - `vsservice/internal/discord/internal/model/message.go`
  - `vsservice/internal/discord/internal/service/service.go`, `mapper.go`, `client.go`
  - `vsservice/internal/discord/internal/lib/clean.go`, `emoji.go`, `parse.go`
- Функционал:
  - `/v1/discord/channels/{channel_id}/messages` — сообщения канала.
  - `/v1/discord/channels/{channel_id}/images` — изображения-вложения.
  - `/v1/discord/news` — публикация новости в Discord (требуется scope `news:create`).

### 3.8 Удалён фронтенд-прокси Discord

- Удалены: `proxy.conf.js`, `.env.example`.
- Обновлены: `Dockerfile`, `nginx.conf`, `compose.yaml` (убраны подстановка токена и nginx-прокси).
- `environment.ts` / `environment.prod.ts`: убран `discordNewsWebhookUrl`.

## 4. Текущая проблема: Discord Bot Token — РЕШЕНО

- Логика Discord API вынесена на бэкенд `vsservice`:
  - Домен `internal/discord` с сервисом `DiscordService`.
  - REST-эндпоинты `/v1/discord/channels/{channel_id}/messages`, `/v1/discord/channels/{channel_id}/images`, `/v1/discord/news`.
- Фронтенд теперь ходит на бэкенд:
  - `entities/discord/api/discord.api.ts` — единый API-сервис.
  - `GameChatService`, `DiscordGalleryService`, `DiscordWebhookService` обновлены.
  - `DiplomacyPageComponent` использует `GameChatService` с `discordDiplomacyChannelId`.
- Удалены:
  - `proxy.conf.js`, `.env.example`.
  - nginx-проксирование `/discord` и подстановка `DISCORD_BOT_TOKEN` в `Dockerfile`/`nginx.conf`.
- Требования к развёртыванию:
  - `DISCORD_BOT_TOKEN` и `DISCORD_NEWS_WEBHOOK_URL` добавлены в `vsservice/compose.yaml` и `compose.dev.yaml`.
  - `DiscordBotToken` обязателен для запуска `vsservice`.

## 5. Конфигурация окружения

- `src/app/core/config/environments/environment.ts`
- `src/app/core/config/environments/environment.prod.ts`
- Ключи:
  - `discordGameChatChannelId` — игровой чат.
  - `discordDiplomacyChannelId` — канал дипломатии.
  - `youtubeApiKey` — YouTube Data API v3.

## 6. Важные файлы

- `API_CONTRACT.md` — бэкенд-контракт.
- `AGENTS.md` — конституция проекта.
- `src/app/routes/seo-data.ts` — SEO-метаданные.
- `src/app/routes/enums/route-keys.ts` — ключи роутов.
- `src/styles.css` — семантические токены цвета + тёмная тема.
- `scripts/check-contrast.mjs` — проверка контраста токенов по WCAG AA.

## 6.1 Дизайн-система: семантические токены цвета

Захардкоженные hex-классы в шаблонах (`bg-[#e2d7bb]`, `text-[#2d201a]`) заменены
на семантические токены. Токены объявлены в `:root` в `src/styles.css`, экспортированы
в Tailwind через `@theme` и переопределены целиком в `html[data-theme='dark']`.

| Группа | Токены | Назначение |
|--------|--------|-----------|
| Поверхности | `surface`, `surface-2`, `surface-3`, `surface-4` | пергаментные панели (в тёмной теме — тёмное дерево) |
| Границы | `line`, `line-strong` | обычная и усиленная рамка |
| Текст | `ink`, `ink-2`, `ink-3` | основной / вторичный / приглушённый |
| Пергамент | `parchment`, `parchment-2`, `parchment-3`, `parchment-dim` | светлый текст на постоянно тёмных подложках |
| Ночь | `night`, `night-2`, `night-deep`, `overlay`, `night-grad-1..3` | тёмные фоны, одинаковые в обеих темах |
| Дерево | `wood`, `wood-2` | коричневые кнопки и градиенты |
| Бренд | `brand`, `brand-hover`, `brand-lit`, `brand-lit-2`, `brand-deep`, `brand-deep-2`, `brand-strong`, `brand-ink`, `accent-soft` | `brand-ink` — только для текста, затемнён под контраст |
| Статусы | `peace`, `neutral-status`, `warning-ink`, `danger-ink`, `danger-strong`, `danger-soft` | дипломатия, ошибки |
| Ранги и медали | `medal-gold/silver/bronze`, `rank-iron`, `rank-silver` | уровни селений, рейтинг |
| Покупки | `status-issued`, `status-done`, `status-refund`, `status-wait` | статусы покупок в профиле |
| Редкость | `rarity-epic`, `rarity-rare` | рамки товаров магазина |
| Прочее | `leader-ink`, `leader-hover`, `leader-soft`, `gold`, `sber` | наместник, золото, СберPay |

**Правила:**
- Новые цвета в шаблонах пишутся ТОЛЬКО через токены. `bg-[#hex]` в HTML/TS запрещён.
- Для текста используются `*-ink`-варианты: они затемнены до порога WCAG AA.
- Тёмная тема НЕ перекрывает hex-классы селекторами `[class*='bg-[#...]']` — этот хак удалён.
  Тёмная тема меняет только значения переменных плюс несколько правил, которые токенами
  не выражаются (снятие текстуры `background-image: none`).
- `node scripts/check-contrast.mjs` проверяет контраст всех текстовых токенов к `surface`
  и `surface-3` в обеих темах. Запускать после изменения палитры.

## 6.2 Доступность

- Глобальное кольцо фокуса `:focus-visible` в `src/styles.css` (2px, цвет `--lh-accent`).
- Кликабельные `div`/`span` заменены на `button`: `lh-input` (триггер и опции select
  с ролями `combobox`/`listbox`/`option`), `rule-link`, карусель привилегий магазина.
- Модальное окно видео получило `role="dialog"`, `aria-modal`, закрытие по `Escape`.
- Ссылки в тексте перекрашены с системного синего (1.84:1 на пергаменте) на `--lh-link` (4.97:1).

## 6.3 Дизайн-система: motion / поверхности / ритм

Утилиты в `src/styles.css`, внедрённые прогоном skill `high-end-visual-design`.
Прогон дал смешанный результат: часть приёмов принята как канон проекта,
часть признана AI-слопом и подлежит откату. Ветка ревизии — `design/keep-approved`.

### 6.3.1 Принято (канон, переиспользовать)

| Утилита / приём | Файл | Назначение |
|---|---|---|
| `--lh-ease-smooth` / `--lh-ease-spring` / `--lh-ease-out-quart` | `src/styles.css` | единые нелинейные кривые. Дефолтные `ease` / `ease-in-out` / `linear` в проекте запрещены |
| `--lh-dur-fast` (200ms) / `--lh-dur-mid` (450ms) / `--lh-dur-slow` (800ms) | `src/styles.css` | шкала длительностей |
| `--default-transition-timing-function`, `--ease-*` в `@theme` | `src/styles.css` | глобальный переопредель кривых для всех Tailwind `transition*`-утилит |
| `--lh-shadow-soft` / `--lh-shadow-lift` / `--lh-shadow-glow` | `src/styles.css` | слоистые ambient-тени вместо резких одиночных `drop-shadow` |
| `.nav-button` + `.nav-button--active` | `layout/header/header.component.css`, `src/styles.css` | кнопки навигации: hover-лифт `-1px`, `:active` просадка `scale(0.95)` @80ms, брендовый градиент активного состояния с двойным inset-бликом. Контраст держится в обеих темах |
| `.dropdown-enter` + каскад `> *:nth-child(n)` | `layout/header/header.component.css` | появление меню хедера: `blur(4px)` → 0 + каскад пунктов по 50ms |
| Двойная фаска (double-bezel) | `.lh-bezel`/`.lh-bezel__core` в `src/styles.css`; `.pulse-card`/`.pulse-card__inner` в `home.component.less`; `.welcome-bezel`/`.welcome-card` в `welcome.component.css` | внешняя оправа `padding: 0.375rem` + hairline `inset 0 0 0 1px` + ядро с концентрическим радиусом `calc(R - padding)` |
| Карточки «Пульса сервера» | `features/home/home.component.*` | двойная фаска + иконка в тёплом медальоне + `tabular-nums` на значениях. Эталон карточки-метрики |
| `.lh-reveal` (+ `.is-visible`) и `RevealDirective` | `src/styles.css`, `shared/lib/directives/reveal.directive.ts` | `[appReveal]` / `[appRevealDelay]`: IntersectionObserver, сдвиг 28px + `blur(8px)`. Уважает `prefers-reduced-motion` |
| Тёмная палитра | `html[data-theme='dark']` в `src/styles.css` | текущие значения токенов тёмной темы лучше предыдущих — не откатывать |
| Экран приветствия | `features/welcome/**` | композиция целиком принята (двойная фаска, hearth-glow, каскад `welcome-stagger`, `.lh-cta`) |
| `.lh-tag` | `src/styles.css` | тег поселения; произвольный цвет с бэкенда остаётся читаемым в обеих темах через `color-mix` |
| `.lh-cta` + `.lh-cta__icon` (+ `--secondary` / `--ghost`) | `src/styles.css`, `home.component.less` | CTA-пилюля с вложенной иконкой-кругом; на hover круг сдвигается, пилюля поднимается на 2px |
| `.lh-panel` | `src/styles.css` | базовая контентная панель, заменила ~44 дубля `bg-lh-primary-2/10 … rounded-2xl p-6`. Используется в 62 местах — единственная разрешённая «плоская» поверхность |
| `text-wrap: balance` (`h1..h6`) / `pretty` (`p`) | `src/styles.css` | нет висячих слов в заголовках |
| Семантические токены текста | все шаблоны | `text-lh-primary` (#3f3c34) заменён на `text-ink` / `text-ink-2` / `text-ink-3` |

### 6.3.2 К пересмотру (AI-слоп)

| Приём | Проблема | Решение |
|---|---|---|
| `.lh-display` (Almendra) | шрифт хороший, применение бессистемное: висит на 20 узлах, включая `<p>` карусели главной и цифры шагов 1/2/3 в `start-game` | ограничить `h1`/`h2` первого уровня секции. Убрать с абзацев и с декоративных цифр |
| Декоративные цифры шагов `text-8xl opacity-25` | `start-game.component.html` — маркеры `01/02/03` поверх контента | удалить или свести к обычному счётчику списка |
| `.lh-eyebrow` | микро-пилюля-кикер над каждым вторым заголовком (5 файлов) | оставить максимум на одной секции главной либо выпилить |
| `blur()` в keyframes | `filter: blur()` добавлен в `market-tab-fade-in`, `lh-stagger-fade-in`, `dropdown-enter`, `.lh-reveal` — 4 независимых механизма появления | свести к одному (`.lh-reveal`), остальные оставить без blur |
| `!important` в `.nav-button--active` | 5 объявлений подряд, обоснования в коде нет | убрать после проверки специфичности Taiga-стилей |
| Несогласованность поверхностей | одна и та же карточка выражена тремя способами: `.lh-panel`, `.lh-bezel`, локальный `.pulse-card` (копия `.lh-bezel` в `home.component.less`) | `.pulse-card` переписать на `.lh-bezel` + `.lh-bezel__core`, локальную копию удалить |
| Инлайновые тени/кривые в шаблонах | `start-game`: `hover:shadow-[0_16px_40px_-16px_rgba(26,17,13,0.3)] ease-[cubic-bezier(0.22,1,0.36,1)]` в каждом блоке | заменить на `.lh-shadow` и токены |

### 6.3.3 Открытые баги

- **Видео на welcome не запускается в Firefox / Zen.** `<video autoplay muted playsinline>`
  + фолбэк-запуск по первому жесту (`onFirstGesture` в `welcome.component.ts`).
  Firefox блокирует автоплей до `loadeddata` и игнорирует `autoplay`, если
  `muted` выставлен только атрибутом при гидрации SSR. Нужно: ставить
  `video.muted = true` в JS до `play()` и дёргать `play()` на `loadedmetadata`,
  а не только по жесту пользователя.
- Бандл превышает бюджет 2.50 MB (~2.66 MB).

## 7. Последний коммит

- `LH | feat: add diplomacy, gallery, videos, game chat, radio widget; remove secrets from configs`
- Сборка: `npm run build` проходит, 11 prerender-роутов.
- Предупреждение: бандл превышает бюджет 2.50 MB (~2.66 MB после дизайн-системы).

## 8. TODO для следующей сессии

- [ ] Прогон по репозиторию по разделу 6.3.2: унифицировать поверхности, урезать `.lh-display` и `.lh-eyebrow`, снять `!important` и инлайновые тени.
- [ ] Починить автоплей видео на welcome в Firefox / Zen (см. 6.3.3).
- [ ] Сгенерировать proto-заглушки и goverter-мапперы в `vsservice` (`make proto && make generate`).
- [ ] Проверить сборку и линтер `vsservice` (`make lint && make test && make build`).
- [ ] Проверить интеграцию фронтенд ↔ бэкенд на dev-стенде.
