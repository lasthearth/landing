# PROJECT_MAP.md — навигация по Last Hearth Landing

> **СГЕНЕРИРОВАНО** командой `npm run map`. Руками не править: правки затрёт следующая генерация.
> Летопись решений — `docs/history.md`, правила и ловушки — `AGENT_RULES_MAP.md`.

## 1. Команды

| Команда | Что выполняет |
|---|---|
| `npm run ng` | `ng` |
| `npm run start` | `node -r dotenv/config node_modules/@angular/cli/bin/ng serve --host 127.0.0.1` |
| `npm run dev` | `node -r dotenv/config node_modules/@angular/cli/bin/ng serve` |
| `npm run build` | `ng build` |
| `npm run build-production` | `ng build --prod` |
| `npm run watch` | `ng build --watch --configuration development` |
| `npm run test` | `ng test` |
| `npm run test:ci` | `ng test --watch=false --browsers=ChromeHeadless` |
| `npm run verify` | `node scripts/verify.mjs` |
| `npm run verify:full` | `node scripts/verify.mjs --full` |
| `npm run arch` | `node scripts/check-architecture.mjs` |
| `npm run map` | `node scripts/gen-project-map.mjs` |
| `npm run sitemap` | `node scripts/gen-sitemap.mjs` |
| `npm run icons` | `node scripts/generate-icons.mjs` |
| `npm run i18n` | `node scripts/i18n-tool.mjs` |
| `npm run context:cost` | `node scripts/check-context-budget.mjs` |
| `npm run format` | `prettier --write AGENTS.md AGENT_RULES_MAP.md README.md docs package.json` |
| `npm run format:check` | `prettier --check AGENTS.md AGENT_RULES_MAP.md README.md docs package.json` |

## 2. Слои src/app

| Слой | Файлов | Внутри |
|---|---|---|
| src/app | 849 | core, entities, features, layout, routes, shared |
| core/ | 55 | config, guards, i18n, interceptors, services, types |
| entities/ | 143 | discord, donate, event, hunger-games, lfg, media, news, notification, player-style, reaction, referral, rule-question, settlement, settlement-tag, user, wiki |
| features/ | 513 | about, admin, analytics, announcement, auth, diplomacy, events, faq, gallery, game-chat, home, hunger-games, landing, lfg, market, mods, new-content, news, not-found, notifications, onboarding, player, privacy-policy, profile, public-offer, reactions, referral, rules, settlements, start-game, verification, videos, welcome, wiki |
| layout/ | 19 | background-scene, footer, header |
| routes/ | 5 | enums |
| shared/ | 109 | lib, styles, ui |

## 3. Слайсы features / entities

| Слайс | Файлов | Сегменты | index.ts | Строк экспорта |
|---|---|---|---|---|
| features/about | 4 | ui | да | 1 |
| features/admin | 44 | ui, model, config | да | 2 |
| features/analytics | 4 | ui | да | 1 |
| features/announcement | 7 | ui, model, api | да | 3 |
| features/auth | 4 | ui | да | 1 |
| features/diplomacy | 8 | ui, model | да | 1 |
| features/events | 21 | ui, model, api, lib | да | 3 |
| features/faq | 3 | — | **нет** | — |
| features/gallery | 7 | ui | да | 1 |
| features/game-chat | 11 | ui, model, lib | да | 3 |
| features/home | 5 | model | да | 1 |
| features/hunger-games | 2 | api | да | 1 |
| features/landing | 2 | — | **нет** | — |
| features/lfg | 16 | ui | да | 1 |
| features/market | 25 | ui, lib | да | 2 |
| features/mods | 5 | ui, config | да | 2 |
| features/new-content | 4 | model, api, lib | да | 2 |
| features/news | 20 | ui, model | да | 5 |
| features/not-found | 3 | — | **нет** | — |
| features/notifications | 6 | ui, model, api | да | 2 |
| features/onboarding | 8 | ui, model, api | да | 2 |
| features/player | 17 | ui, model, api, lib | да | 6 |
| features/privacy-policy | 3 | — | **нет** | — |
| features/profile | 49 | ui | да | 5 |
| features/public-offer | 3 | — | **нет** | — |
| features/reactions | 6 | ui, api | да | 2 |
| features/referral | 5 | — | да | 2 |
| features/rules | 79 | ui, model, config | да | 1 |
| features/settlements | 70 | — | **нет** | — |
| features/start-game | 3 | — | **нет** | — |
| features/verification | 4 | model, api | да | 4 |
| features/videos | 15 | ui, model, api, lib, config | да | 1 |
| features/welcome | 3 | — | **нет** | — |
| features/wiki | 47 | ui, api, lib | да | 6 |
| entities/discord | 3 | model, api | да | 2 |
| entities/donate | 12 | model, api | да | 11 |
| entities/event | 5 | model, api, lib | да | 4 |
| entities/hunger-games | 7 | model, api | да | 6 |
| entities/lfg | 5 | model, api | да | 3 |
| entities/media | 3 | model, api | да | 2 |
| entities/news | 9 | model, api, lib | да | 7 |
| entities/notification | 4 | model, api | да | 3 |
| entities/player-style | 12 | ui, model, api, lib | да | 8 |
| entities/reaction | 4 | model, api | да | 4 |
| entities/referral | 5 | model, api | да | 4 |
| entities/rule-question | 4 | model, api | да | 4 |
| entities/settlement | 37 | ui, model, api, lib, config | да | 34 |
| entities/settlement-tag | 13 | ui, model, api, lib | да | 10 |
| entities/user | 14 | ui, model, api, config | да | 9 |
| entities/wiki | 6 | model, api, lib | да | 6 |

## 4. Роуты

| Путь | Компонент | Гварды | Словари i18n | Пререндер | SEO-ключ |
|---|---|---|---|---|---|
| `wiki/edit/:id` | `—` | userGuard, wikiEditorLeaveGuard | wiki | — | wikiEditor |
| `/` | `HomeComponent` | — | home | да | home |
| `/wiki` | `WikiListPageComponent` | — | wiki | да | wiki |
| `/wiki/razdel/:section` | `WikiSectionPageComponent` | — | wiki | — | wiki |
| `/wiki/:slug` | `WikiArticlePageComponent` | — | wiki | — | wiki |
| `/home` | `—` | — | — | — | — |
| `/rules` | `RulesComponent` | — | rules | да | rules |
| `/profile` | `ProfileComponent` | userGuard | profile, player, settlements, events, market | — | profile |
| `/profile/stats` | `—` | — | — | — | stats |
| `/profile/how-play` | `HowPlayComponent` | — | — | — | howPlay |
| `/profile/settlement` | `—` | — | — | — | settlement |
| `/profile/style` | `—` | — | — | — | profileStyle |
| `/profile/wiki` | `MySuggestionsComponent` | — | wiki | — | mySuggestions |
| `/profile/referral` | `ReferralWidgetComponent` | — | referral | — | referral |
| `/profile/admin` | `AdminComponent` | adminGuard | admin, wiki | — | admin |
| `/start-game` | `StartGameComponent` | guestGuard | — | да | startGame |
| `/about` | `AboutPageComponent` | — | about, settlements | да | about |
| `/mods` | `ModsPageComponent` | — | mods | да | mods |
| `/market` | `MarketComponent` | — | market | да | market |
| `/privacy-policy` | `—` | — | legal | да | privacyPolicy |
| `/public-offer` | `—` | — | legal | да | publicOffer |
| `/faq` | `FaqComponent` | — | faq | да | faq |
| `/settlements` | `SettlementsComponent` | — | settlements | да | settlements |
| `/gallery` | `GalleryComponent` | — | gallery | да | gallery |
| `/videos` | `—` | — | videos | да | videos |
| `/diplomacy` | `—` | — | diplomacy | да | diplomacy |
| `/events` | `EventsPageComponent` | — | events, settlements | да | events |
| `/lfg` | `LfgPageComponent` | — | lfg, settlements | да | lfg |
| `/join/:code` | `—` | — | settlements | — | join |
| `/player/:nick` | `—` | — | player, settlements | — | player |
| `/settlements/:id` | `—` | — | settlements | — | settlements |
| `/news` | `NewsListPageComponent` | — | news | да | news |
| `/news/:id` | `NewsPageComponent` | — | — | — | news |
| `/unauthorized` | `—` | — | — | — | — |
| `/**` | `NotFoundComponent` | — | — | — | — |

## 5. Словари i18n (feature)

| Словарь | KB | Грузится на |
|---|---|---|
| about | 4.6 | /about |
| admin | 32.4 | /profile/admin |
| analytics | 0.9 | — |
| common | 1.0 | — |
| diplomacy | 1.7 | /diplomacy |
| events | 8.0 | /profile, /events |
| faq | 2.3 | /faq |
| footer | 2.8 | — |
| gallery | 1.3 | /gallery |
| header | 2.3 | — |
| home | 10.3 | / |
| legal | 69.0 | /privacy-policy, /public-offer |
| lfg | 15.7 | /lfg |
| market | 13.7 | /profile, /market |
| mods | 1.5 | /mods |
| news | 10.7 | /news |
| player | 18.7 | /profile, /player/:nick |
| profile | 23.2 | /profile |
| referral | 1.5 | /profile/referral |
| rules | 220.2 | /rules |
| settlements | 59.0 | /profile, /about, /settlements, /events, /lfg, /join/:code, /player/:nick, /settlements/:id |
| shared | 26.7 | — |
| videos | 2.1 | /videos |
| wiki | 61.5 | wiki/edit/:id, /wiki, /wiki/razdel/:section, /wiki/:slug, /profile/wiki, /profile/admin |

Общие словари (common, header, footer, shared, news) подключены сразу в
`src/app/core/i18n/translations/index.ts`. Остальные приезжают вместе с роутом через `loadPage()`.

## 6. Проверки

| Проверка | Скрипт |
|---|---|
| Границы FSD, index.ts, слои | scripts/check-architecture.mjs |
| Полнота локалей ru/en | scripts/check-i18n.mjs |
| Контраст токенов WCAG AA | scripts/check-contrast.mjs |
| Бюджет агентских документов | scripts/check-context-budget.mjs |
| Живость указателей | scripts/check-doc-pointers.mjs |
