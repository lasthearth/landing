# PROJECT_MAP.md — навигация по Last Hearth Landing

> **СГЕНЕРИРОВАНО** командой `npm run map`. Руками не править: правки затрёт следующая генерация.
> Летопись решений — `docs/history.md`, правила и ловушки — `AGENT_RULES_MAP.md`.

## 1. Команды

| Команда                    | Что выполняет                                                                   |
| -------------------------- | ------------------------------------------------------------------------------- |
| `npm run ng`               | `ng`                                                                            |
| `npm run start`            | `node -r dotenv/config node_modules/@angular/cli/bin/ng serve --host 127.0.0.1` |
| `npm run dev`              | `node -r dotenv/config node_modules/@angular/cli/bin/ng serve`                  |
| `npm run build`            | `ng build`                                                                      |
| `npm run build-production` | `ng build --prod`                                                               |
| `npm run watch`            | `ng build --watch --configuration development`                                  |
| `npm run test`             | `ng test`                                                                       |
| `npm run test:ci`          | `ng test --watch=false --browsers=ChromeHeadless`                               |
| `npm run verify`           | `node scripts/verify.mjs`                                                       |
| `npm run verify:full`      | `node scripts/verify.mjs --full`                                                |
| `npm run arch`             | `node scripts/check-architecture.mjs`                                           |
| `npm run map`              | `node scripts/gen-project-map.mjs`                                              |
| `npm run i18n`             | `node scripts/i18n-tool.mjs`                                                    |
| `npm run context:cost`     | `node scripts/check-context-budget.mjs`                                         |
| `npm run format`           | `prettier --write AGENTS.md AGENT_RULES_MAP.md README.md docs package.json`     |
| `npm run format:check`     | `prettier --check AGENTS.md AGENT_RULES_MAP.md README.md docs package.json`     |

## 2. Слои src/app

| Слой      | Файлов | Внутри                                                                                                                                                                                                                                                                                                      |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| src/app   | 755    | core, entities, features, layout, routes, shared, styles                                                                                                                                                                                                                                                    |
| core/     | 44     | config, guards, i18n, interceptors, services, types                                                                                                                                                                                                                                                         |
| entities/ | 137    | discord, donate, event, hunger-games, lfg, media, news, notification, player-style, reaction, referral, rule-question, settlement, settlement-tag, user                                                                                                                                                     |
| features/ | 451    | admin, announcement, auth, diplomacy, events, faq, gallery, game-chat, home, hunger-games, landing, lfg, market, new-content, news, not-found, notifications, onboarding, player, privacy-policy, profile, public-offer, reactions, referral, rules, settlements, start-game, verification, videos, welcome |
| layout/   | 18     | background-scene, footer, header                                                                                                                                                                                                                                                                            |
| routes/   | 3      | enums                                                                                                                                                                                                                                                                                                       |
| shared/   | 96     | lib, styles, ui                                                                                                                                                                                                                                                                                             |
| styles/   | 2      | appearances                                                                                                                                                                                                                                                                                                 |

## 3. Слайсы features / entities

| Слайс                   | Файлов | Сегменты                    | index.ts | Строк экспорта |
| ----------------------- | ------ | --------------------------- | -------- | -------------- |
| features/admin          | 44     | ui, model, config           | да       | 2              |
| features/announcement   | 7      | ui, model, api              | да       | 3              |
| features/auth           | 4      | ui                          | да       | 1              |
| features/diplomacy      | 8      | ui, model                   | да       | 1              |
| features/events         | 21     | ui, model, api, lib         | да       | 3              |
| features/faq            | 3      | —                           | **нет**  | —              |
| features/gallery        | 7      | ui                          | да       | 1              |
| features/game-chat      | 11     | ui, model, lib              | да       | 3              |
| features/home           | 5      | model                       | да       | 1              |
| features/hunger-games   | 2      | api                         | да       | 1              |
| features/landing        | 2      | —                           | **нет**  | —              |
| features/lfg            | 16     | ui                          | да       | 1              |
| features/market         | 26     | ui, lib                     | да       | 2              |
| features/new-content    | 4      | model, api, lib             | да       | 2              |
| features/news           | 17     | ui, model                   | да       | 4              |
| features/not-found      | 3      | —                           | **нет**  | —              |
| features/notifications  | 6      | ui, model, api              | да       | 2              |
| features/onboarding     | 8      | ui, model, api              | да       | 2              |
| features/player         | 17     | ui, model, api, lib         | да       | 6              |
| features/privacy-policy | 3      | —                           | **нет**  | —              |
| features/profile        | 49     | ui                          | да       | 5              |
| features/public-offer   | 3      | —                           | **нет**  | —              |
| features/reactions      | 6      | ui, api                     | да       | 2              |
| features/referral       | 5      | —                           | да       | 2              |
| features/rules          | 79     | ui, model, config           | да       | 1              |
| features/settlements    | 70     | —                           | **нет**  | —              |
| features/start-game     | 3      | —                           | **нет**  | —              |
| features/verification   | 4      | model, api                  | да       | 4              |
| features/videos         | 15     | ui, model, api, lib, config | да       | 1              |
| features/welcome        | 3      | —                           | **нет**  | —              |
| entities/discord        | 3      | model, api                  | да       | 2              |
| entities/donate         | 12     | model, api                  | да       | 11             |
| entities/event          | 5      | model, api, lib             | да       | 4              |
| entities/hunger-games   | 7      | model, api                  | да       | 6              |
| entities/lfg            | 5      | model, api                  | да       | 3              |
| entities/media          | 3      | model, api                  | да       | 2              |
| entities/news           | 9      | model, api, lib             | да       | 7              |
| entities/notification   | 4      | model, api                  | да       | 3              |
| entities/player-style   | 12     | ui, model, api, lib         | да       | 8              |
| entities/reaction       | 4      | model, api                  | да       | 4              |
| entities/referral       | 5      | model, api                  | да       | 4              |
| entities/rule-question  | 4      | model, api                  | да       | 4              |
| entities/settlement     | 37     | ui, model, api, lib, config | да       | 34             |
| entities/settlement-tag | 13     | ui, model, api, lib         | да       | 10             |
| entities/user           | 14     | ui, model, api, config      | да       | 9              |

## 4. Роуты

| Путь                  | Компонент                 | Гварды     | Словари i18n                                 | Пререндер | SEO-ключ      |
| --------------------- | ------------------------- | ---------- | -------------------------------------------- | --------- | ------------- |
| `/`                   | `—`                       | —          | —                                            | —         | —             |
| `/home`               | `HomeComponent`           | —          | home                                         | да        | home          |
| `/rules`              | `RulesComponent`          | —          | rules                                        | да        | rules         |
| `/profile`            | `ProfileComponent`        | userGuard  | profile, player, settlements, events, market | —         | profile       |
| `/profile/stats`      | `—`                       | —          | —                                            | —         | stats         |
| `/profile/how-play`   | `HowPlayComponent`        | —          | —                                            | —         | howPlay       |
| `/profile/settlement` | `—`                       | —          | —                                            | —         | settlement    |
| `/profile/style`      | `—`                       | —          | —                                            | —         | profileStyle  |
| `/profile/referral`   | `ReferralWidgetComponent` | —          | referral                                     | —         | referral      |
| `/profile/admin`      | `AdminComponent`          | adminGuard | admin                                        | —         | admin         |
| `/start-game`         | `StartGameComponent`      | guestGuard | —                                            | да        | startGame     |
| `/market`             | `MarketComponent`         | —          | market                                       | да        | market        |
| `/privacy-policy`     | `—`                       | —          | legal                                        | да        | privacyPolicy |
| `/public-offer`       | `—`                       | —          | legal                                        | да        | publicOffer   |
| `/faq`                | `FaqComponent`            | —          | faq                                          | да        | faq           |
| `/settlements`        | `SettlementsComponent`    | —          | settlements                                  | да        | settlements   |
| `/gallery`            | `GalleryComponent`        | —          | gallery                                      | —         | gallery       |
| `/videos`             | `—`                       | —          | videos                                       | —         | videos        |
| `/diplomacy`          | `—`                       | —          | diplomacy                                    | —         | diplomacy     |
| `/events`             | `EventsPageComponent`     | —          | events, settlements                          | —         | events        |
| `/lfg`                | `LfgPageComponent`        | —          | lfg, settlements                             | —         | lfg           |
| `/join/:code`         | `—`                       | —          | settlements                                  | —         | join          |
| `/player/:nick`       | `—`                       | —          | player, settlements                          | —         | player        |
| `/settlements/:id`    | `—`                       | —          | settlements                                  | —         | settlements   |
| `/news/:id`           | `NewsPageComponent`       | —          | —                                            | —         | news          |
| `/unauthorized`       | `—`                       | —          | —                                            | —         | —             |
| `/**`                 | `NotFoundComponent`       | —          | —                                            | —         | —             |

## 5. Словари i18n (feature)

| Словарь     | KB    | Грузится на                                                                         |
| ----------- | ----- | ----------------------------------------------------------------------------------- |
| admin       | 32.6  | /profile/admin                                                                      |
| common      | 1.2   | —                                                                                   |
| diplomacy   | 1.7   | /diplomacy                                                                          |
| events      | 8.0   | /profile, /events                                                                   |
| faq         | 2.3   | /faq                                                                                |
| footer      | 1.5   | —                                                                                   |
| gallery     | 1.3   | /gallery                                                                            |
| header      | 2.3   | —                                                                                   |
| home        | 10.3  | /home                                                                               |
| legal       | 62.7  | /privacy-policy, /public-offer                                                      |
| lfg         | 15.8  | /lfg                                                                                |
| market      | 13.7  | /profile, /market                                                                   |
| news        | 10.1  | —                                                                                   |
| player      | 19.0  | /profile, /player/:nick                                                             |
| profile     | 23.6  | /profile                                                                            |
| referral    | 1.5   | /profile/referral                                                                   |
| rules       | 222.4 | /rules                                                                              |
| settlements | 59.7  | /profile, /settlements, /events, /lfg, /join/:code, /player/:nick, /settlements/:id |
| shared      | 26.5  | —                                                                                   |
| videos      | 2.1   | /videos                                                                             |

Общие словари (common, header, footer, shared, news) подключены сразу в
`src/app/core/i18n/translations/index.ts`. Остальные приезжают вместе с роутом через `loadPage()`.

## 6. Проверки

| Проверка                    | Скрипт                           |
| --------------------------- | -------------------------------- |
| Границы FSD, index.ts, слои | scripts/check-architecture.mjs   |
| Полнота локалей ru/en       | scripts/check-i18n.mjs           |
| Контраст токенов WCAG AA    | scripts/check-contrast.mjs       |
| Бюджет агентских документов | scripts/check-context-budget.mjs |
| Живость указателей          | scripts/check-doc-pointers.mjs   |
