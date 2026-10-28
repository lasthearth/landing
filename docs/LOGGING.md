# Логирование и реплей сессии

> **Что это.** План наблюдательности: по обращению пользователя восстановить единый таймлайн
> «что он видел и делал → что делало приложение → что ответил бэкенд».
> Решения — `docs/decisions.md`, обоснования — `docs/history.md`, ловушки HTTP — `docs/API.md`.

## Цель

Три слоя, которые складываются в один таймлайн:

1. **Опыт пользователя** — маршрут, значимые клики, показанные уведомления и диалоги, состояние загрузки.
2. **Внутренние операции** — HTTP-запросы, действия сервисов и сторов, смена состояния авторизации, решения о согласии.
3. **Видимый результат** — что реально увидел человек: текст и вид алерта, успех или провал действия, итоговый экран.

Критерий готовности: по `sid` и моменту инцидента собирается таймлайн из трёх слоёв, а клиентские HTTP-события
соединяются с логом контейнера и бэкенда по `corrId`.

## Что есть сейчас

| Уже работает                                                                                                                         | Где                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clarity (id `u3k2hyqs0a`) — визуальный реплей, только после согласия на аналитику                                                    | `src/app/core/services/analytics.service.ts:199`                                                                                                                                                                                                                                                                                                                                                 |
| Яндекс.Метрика: `METRIKA_ID = 0`, счётчик не подключён, семь целей никуда не уходят                                                  | `src/app/core/services/analytics.service.ts:16`, `src/app/core/types/analytics-goal.ts:8`                                                                                                                                                                                                                                                                                                        |
| Перехват ошибок HTTP; для GET показывает алерт и возвращает `EMPTY`                                                                  | `src/app/core/interceptors/error.interceptor.ts:29`                                                                                                                                                                                                                                                                                                                                              |
| Точка, через которую проходят почти все видимые исходы (`showError`, `showSuccess`, `handleError`, `handleSuccess`), ~28 компонентов | `src/app/core/services/request-status.service.ts`                                                                                                                                                                                                                                                                                                                                                |
| Подписка на `NavigationStart/End/Cancel/Error` — индикатор прогресса                                                                 | `src/app/core/services/route-loading.service.ts:25`                                                                                                                                                                                                                                                                                                                                              |
| Идентичность без лишней работы: `userId` (`sub`), `userName`, `roles` из `jwtDecode(id_token)`                                       | `src/app/entities/user/api/user.service.ts:283`                                                                                                                                                                                                                                                                                                                                                  |
| 13 `console.*` вместо логгера; `console.log` при старте сервера — единственный серверный лог                                         | `src/main.ts` (6), `src/server.ts` (179), `src/app/core/services/local-storage.service.ts` (37, 56, 74, 89), `src/app/entities/user/api/user.service.ts` (206, 210, 291), `src/app/features/settlements/settlements.component.ts` (230), `src/app/features/home/home.component.ts` (459), `src/app/entities/wiki/api/wiki.api.ts` (290), `src/app/features/wiki/api/wiki-store.service.ts` (181) |

Дыры: нет `ErrorHandler`, `window.onerror` и `unhandledrejection`; нет идентификатора сессии;
нет корреляции фронт ↔ бэкенд (ни один интерцептор не ставит request id); исход действия не записывается;
ошибка GET теряется после `EMPTY`; `serverApiTimeoutInterceptor` на SSR молча заменяет ошибку пустым ответом;
`sendBeacon`, очереди и батчей нет; эндпоинта приёма логов в `API_CONTRACT.md` нет.

Данные Clarity агент читает без браузера: `npm run clarity` — дашборд, выборка записей сессий, документация
(команды, токен и лимиты — `docs/TOOLING.md`, раздел «Clarity»).

Прямой `TuiAlertService` мимо `RequestStatusService` — 5 мест: `src/app/core/interceptors/error.interceptor.ts:30`,
`src/app/core/services/request-status.service.ts:13`,
`src/app/features/mods/ui/mods-admin-panel/mods-admin-panel.component.ts:73`,
`src/app/features/market/components/purchase-dialog/purchase-dialog.component.ts:107`,
`src/app/features/referral/services/referral-applier.service.ts:47`. Их тоже надо закрыть событиями `outcome.*`.
`NotificationService` — не тосты, а потоки данных (приглашения, верификации): его логируем как `action.*`, не как исход.

## Модель события

Один тип `LhLogEvent` на все слои; объявление ляжет в новый файл src/app/core/logger/log-event.types.ts:

| Поле     | Тип                                                                                         | Смысл                                                             |
| -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `sid`    | `string`                                                                                    | Идентификатор сессии, `sessionStorage`, живёт до закрытия вкладки |
| `seq`    | `number`                                                                                    | Монотонный счётчик внутри сессии: порядок и потерянные батчи      |
| `ts`     | `string`                                                                                    | ISO-время с миллисекундами                                        |
| `type`   | `'nav' \| 'http' \| 'outcome' \| 'action' \| 'error' \| 'auth' \| 'consent' \| 'lifecycle'` | Слой                                                              |
| `event`  | `string`                                                                                    | Стабильное имя `<домен>.<действие>` из закрытого union            |
| `level`  | `'debug' \| 'info' \| 'warn' \| 'error'`                                                    | Уровень; определяет загрузку на сервер                            |
| `route`  | `string`                                                                                    | Путь без query на момент события                                  |
| `corrId` | `string?`                                                                                   | `X-Request-Id` запроса: ключ соединения с логом бэкенда           |
| `userId` | `string?`                                                                                   | Идентификатор игрока, если он вошёл                               |
| `opId`   | `string?`                                                                                   | Связывает `start` и `done`/`failed` одной операции                |
| `data`   | `Record<string, string \| number \| boolean>`                                               | Только поля из allowlist этого события                            |

Имена событий: `nav.done`, `http.done`, `http.failed`, `outcome.alert`, `outcome.dialog`, `error.uncaught`,
`error.unhandledrejection`, `auth.state`, `consent.decision`, `action.purchase.start`, `lifecycle.boot`, `lifecycle.render`.
Имя добавляется в union типов — свободные строки запрещены.

## Точки захвата

| Слой          | Что пишем                                                                         | Где код                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Навигация     | Путь, id навигации, длительность, отмена или ошибка гварда                        | дополняем готовую подписку в `src/app/core/services/route-loading.service.ts:25` — новый сервис не нужен                 |
| HTTP          | Метод, путь без query, статус, длительность, `corrId`, признак `SKIP_ERROR_ALERT` | новый файл src/app/core/interceptors/logging.interceptor.ts, регистрация в `src/app/core/config/app.config.ts:128`       |
| Таймаут SSR   | Факт замены ответа пустым по таймауту 3 с                                         | `src/app/core/interceptors/server-api-timeout.interceptor.ts:26`                                                         |
| Ошибки        | Непойманные исключения и промисы: сообщение, стек, маршрут                        | новый файл src/app/core/logger/global-error.handler.ts + провайдер `ErrorHandler`, слушатель `unhandledrejection`        |
| Видимый исход | Текст и `appearance` каждого алерта, открытие и закрытие диалога                  | четыре метода `RequestStatusService`, `src/app/core/interceptors/error.interceptor.ts:50`, пять прямых `TuiAlertService` |
| Авторизация   | Вход, выход, неудача продления токена — без самих токенов                         | `src/app/entities/user/api/user.service.ts:206` вместо `console.error`                                                   |
| Согласие      | Решение по аналитике и его время                                                  | `src/app/core/services/consent.service.ts:44`                                                                            |
| Действия фич  | Только дорогие операции: покупка, создание поселения, верификация, загрузка файла | вручную через `LoggerService`, парой `start` / `done\|failed`                                                            |
| SSR           | Request id, метод, путь, статус, длительность, user agent — JSON в stdout         | middleware в `src/server.ts` до `angularApp.handle`                                                                      |
| Clarity       | `clarity('identify', sid)` — связывает визуальный реплей с нашим таймлайном       | `analytics.service.ts` после подключения скрипта                                                                         |

Не пишем: каждый рендер, движения мыши и скроллы, тела запросов и ответов целиком, токены, пароли, URL с query
(в колбэке OIDC там `?code=`).

**Ловушка переноса HTTP.** `provideClientHydration(withHttpTransferCacheOptions(...))` в `app.config.ts:107`
переносит ответы SSR в браузер, и клиент эти запросы не повторяет: интерцептор их не увидит, и в таймлайне
останется дыра на всех Server- и Prerender-роутах. Такие запросы пишет серверная сторона — SSR-лог
в stdout с тем же `corrId`, что уйдет в разметку страницы через состояние приложения.

## Транспорт и хранение

- **Кольцевой буфер** в памяти, последние 300 событий, всегда и независимо от согласия (новый файл
  src/app/core/logger/event-buffer.service.ts).
- **`sid`** генерируется только в браузере после гидратации и лежит в `sessionStorage`: пререндеренный HTML общий
  для всех, поэтому в разметку идентификатор сессии попадать не должен.
- **Экспорт диагностики**: кнопка «Скопировать диагностику» отдаёт JSON буфера + `sid` + `siteVersion` + режим рендера.
  Пользователь прикладывает его к обращению. Текст — через `npm run i18n -- set`.
- **Загрузка на сервер**: батчами, `navigator.sendBeacon` на `pagehide` и `fetch` с `keepalive` каждые 10 с или 20 событий.
  `warn` и `error` — 100 %, `info` — сэмплирование 10 %. Требует эндпоинта `POST {apiUrl}/logs`, которого сейчас нет.
- **Бэкенд**: VintageAPI публикует батч в NATS, отдельный потребитель пишет в Mongo; TTL 14 дней для `info`, 90 для `error`;
  индексы по `sid`, `corrId`, `userId`, `ts`.
- **Серверные логи**: JSON в stdout, собирает Docker; `corrId` из заголовка `X-Request-Id` — тот же, что в клиентском событии.
  Заголовок нужно добавить в `Access-Control-Allow-Headers` бэкенда, иначе preflight упадёт.

## Приватность

Никогда не пишем: `Authorization`, access- и refresh-токены, пароли, содержимое файлов, `gameServerPassword`
из `environment.ts`, полные URL с query. Из пользователя — только `userId` и ник. IP остаётся на стороне сервера.
`gameServerPassword` сейчас лежит в `environment.ts` и `environment.prod.ts` открытым текстом — в лог он попадать
не должен ни при каком уровне. Его перенос в переменные окружения — отдельная задача, её стоит завести в `docs/TODO.md`.

Редакция на входе в `LoggerService` (новый файл src/app/core/logger/redact.function.ts): allowlist ключей `data`
для каждого события плюс маска значений по имени ключа (`token`, `password`, `secret`, `code`).

## Фазы

**Фаза 0 — решения (0.5 дня).** Закрыть четыре вопроса из раздела «Открытые решения».

**Фаза 1 — ядро без бэкенда (2–3 дня).** Файлы `log-event.types.ts`, `logger.service.ts`, `event-buffer.service.ts`,
`redact.function.ts`, `global-error.handler.ts`, `logging.interceptor.ts`; события навигации в `route-loading.service.ts`;
инструменты в `RequestStatusService` и `error.interceptor.ts`; кнопка экспорта.
Готово, когда по буферу восстанавливается таймлайн реальной сессии и `npm run verify` зелёный.
Спеки обязательны на `LoggerService` (буфер, редакцию, `seq`) и на `logging.interceptor` (`corrId`, длительность, ошибка).

**Фаза 2 — серверная корреляция (1–2 дня).** Middleware в `src/server.ts`, `X-Request-Id` в интерцепторе, JSON-логи в stdout.
Готово, когда один `corrId` находится и в клиентском экспорте, и в логе контейнера.

**Фаза 3 — загрузка и просмотр (2–4 дня).** `POST /v1/logs` в VintageAPI, новый файл
src/app/core/logger/log-uploader.service.ts, панель diagnostics-panel в `src/app/features/admin` —
в существующий хост на роуте `profile/admin` (гейт уже стоит: `adminGuard`), `clarity('identify', sid)`.
Готово, когда админ находит сессию по нику и видит таймлайн с HTTP-статусами.

**Фаза 4 — зачистка (1 день).** 13 `console.*` → `LoggerService`, правила в `AGENTS.md`, записи в `docs/history.md`
и `docs/decisions.md`, обновление `docs/project-map.md` через `npm run map`.

Новые файлы (все в `core`, JSDoc на русском, один файл — одна сущность):

```text
src/app/core/logger/log-event.types.ts
src/app/core/logger/logger.service.ts
src/app/core/logger/event-buffer.service.ts
src/app/core/logger/redact.function.ts
src/app/core/logger/global-error.handler.ts
src/app/core/logger/log-uploader.service.ts        # фаза 3
src/app/core/interceptors/logging.interceptor.ts
src/app/features/admin/ui/diagnostics-panel/…      # фаза 3
```

## Правила для агентов

1. `console.*` в новом коде запрещён — только `LoggerService`.
2. Видимый исход показываем через `RequestStatusService`: он уже пишет событие. Прямой `TuiAlertService` —
   только вместе с явным `logger.event('outcome.alert', …)`.
3. Новое событие — имя в union типов и allowlist полей `data`.
4. Дорогую операцию логируем парой `action.*.start` и `action.*.done|failed` с общим `opId`.
5. После новых файлов — `npm run map`, после нового текста — `npm run i18n -- set <домен> <ключ> "<текст>"`.

## Открытые решения

| Вопрос                                         | Варианты                                                              | Рекомендация                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Грузить диагностику без согласия на аналитику? | (а) только с согласием; (б) `error` всегда; (в) только ручной экспорт | (б): ошибки без PII — это необходимость, остальное после согласия                                |
| Где принимать логи?                            | VintageAPI `/v1/logs`; отдельный приёмник; только stdout SSR          | VintageAPI: там уже Mongo и NATS, публикация в NATS развязывает приём и запись                   |
| Сколько хранить?                               | 14 дней; 30 дней; по уровням                                          | 14 дней для `info`, 90 для `error`                                                               |
| Нужен ли свой DOM-реплей вместо Clarity?       | свой рекордер; Clarity; ничего                                        | Clarity: визуальную часть он закрывает, наш лог закрывает смысл, связка через `identify(sid)`    |
| Включать ли Метрику, пока нет номера счётчика? | ждать номер; убрать цели; оставить как есть                           | Оставить сервис и получить номер: семь целей уже расставлены и молча теряются (`METRIKA_ID = 0`) |
