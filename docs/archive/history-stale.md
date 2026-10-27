# Архив устаревших разделов летописи

> **Что это.** Разделы, вынесенные из `docs/history.md`, чтобы летопись укладывалась
> в бюджет 120 kB. Содержимое перенесено без правок; актуальные факты живут
> в `docs/TOOLING.md`, `docs/API.md` и `docs/project-map.md`.
>
> Перенесено 27.10.2026 вместе с записями §3.-26 и §3.-27.

## Текущая проблема: Discord Bot Token — РЕШЕНО

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

## Конфигурация окружения (срез на момент переноса)

- `src/app/core/config/environments/environment.ts`
- `src/app/core/config/environments/environment.prod.ts`
- Ключи:
    - `discordGameChatChannelId` — игровой чат.
    - `discordDiplomacyChannelId` — канал дипломатии.
    - `youtubeApiKey` — YouTube Data API v3 (в `environment.ts` этого ключа уже нет).

## Важные файлы (срез на момент переноса)

- `API_CONTRACT.md` — бэкенд-контракт.
- `AGENTS.md` — конституция проекта.
- `src/app/routes/seo-data.ts` — SEO-метаданные.
- `src/app/routes/enums/route-keys.ts` — ключи роутов.
- `src/styles.css` — семантические токены цвета + тёмная тема.
- `scripts/check-contrast.mjs` — проверка контраста токенов по WCAG AA.
- `scripts/check-i18n.mjs` — проверка полноты обеих локалей в словаре i18n.

## Последний коммит (срез на момент переноса)

- `LH | feat: add diplomacy, gallery, videos, game chat, radio widget; remove secrets from configs`
- Сборка: `npm run build` проходит, 11 prerender-роутов.
