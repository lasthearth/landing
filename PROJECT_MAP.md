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

### 3.1 Галерея скриншотов (`/gallery`)
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

## 7. Последний коммит

- `LH | feat: add diplomacy, gallery, videos, game chat, radio widget; remove secrets from configs`
- Сборка: `npm run build` проходит, 11 prerender-роутов.
- Предупреждение: бандл превышает бюджет 2.50 MB (~2.53 MB).

## 8. TODO для следующей сессии

- [ ] Сгенерировать proto-заглушки и goverter-мапперы в `vsservice` (`make proto && make generate`).
- [ ] Проверить сборку и линтер `vsservice` (`make lint && make test && make build`).
- [ ] Проверить интеграцию фронтенд ↔ бэкенд на dev-стенде.
