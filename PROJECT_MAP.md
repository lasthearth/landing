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

### 3.-7 Роли игрока в тултипе чипа

> При наведении на чип игрока тултип теперь показывает роли игрока
> в текущем поселении (рядом с короной владельца и статусом онлайн).

- `entities/user/ui/player-chip/`: новый опциональный вход `settlement`
  (`ISettlement | null`); computed `memberRoleNames` считает через
  `getMemberRoleNames` из `@entities/settlement` (служебная роль `owner`
  по-прежнему исключена — её обозначает корона). Все три потребителя
  (`settlement-card`, `settlement-detailed`, страница управления) передают
  свои данные поселения. Новый стиль `.player-tooltip__member-role` —
  нейтральный бейдж, в отличие от бейджа главы.
- Циклических зависимостей нет: `@entities/settlement` ничего не импортирует
  из `@entities/user`.
- Выделение чипов с ролями: computed `hasRoles` показывает перед именем
  нейтральную иконку `@tui.shield` (`--lh-ink-3`) — приглашение навестись.
  Акцентная обводка из первого варианта убрана: перебивала корону главы
  и конкурировала с точкой статуса.
- Тип ответа `invitePlayer` приведён к спеке: `InviteMemberResponse` пустой,
  метод возвращает `Observable<void>` (был ошибочный `{users: any[]}`).
- Контакты на карточке селения: если `contact_info` задан, под описанием
  выводится строка с иконкой `@tui.contact-round` и клампом до двух строк
  (`title` отдаёт полный текст). Ключи `settlements.card.contacts` (ru/en)
  используются как aria/title-лейбл.
- Сортировка списка селений переведена с `lh-secondary-button` +
  `!important`-перекрытий фона на системный идиом `.nav-button` /
  `.nav-button--active` (тот же, что вкладки админки и навигация профиля):
  активный ключ — брендовый градиент, ховер-лифт и просадка как у всей
  навигации. Ряд размечен как `<nav>` с `aria-label`/`aria-current`
  (`settlements.list.sort.label`). Кнопки «Восток»/«Запад»/«Сюзеренство»
  убраны вместе с ветками сортировки, обогащением `tagTypes` и хелпером
  `getSpecialTagTypes`; ключи переводов `sort.east/west/suzerain` удалены
  из обеих локалей. Прогрев `tagStore.loadTags$()` в конструкторе оставлен:
  теги на карточках зависят от него.
- Первая кнопка быстрых действий на главной зависит от авторизации
  (`quickActions` стал computed): гость видит «Как начать» → `/start-game`,
  авторизованный — «Где IP?» (`home.quickActions.whereIp`, иконка
  `@tui.globe`) → `/profile/how-play`, где лежит IP сервера.

### 3.-6 SSR-аудит и «welcome больше не показывается повторно»

> Проведён аудит обращений к браузерным API на предмет серверного рендера,
> приветственный экран после первого пролистывания больше не показывается.

- **SSR-аудит:** кодовая база в целом безопасна — `LocalStorageService`
  защищён `typeof localStorage`, FAQ/privacy/public-offer работают с DOM
  только в `afterNextRender`, `RevealDirective` проверяет наличие
  `IntersectionObserver`, game-chat/radio гейтятся `isPlatformBrowser`.
  Исправлены два непоследовательных места:
  - `game-chat-widget` обращался к `localStorage` напрямую (минуя сервис):
    чтение настройки звука и `toggleSound` переведены на `LocalStorageService`,
    ставший ненужным приватный метод `loadSoundSetting` удалён.
  - `layout.component.ts` `updateScrollLock` проверял `typeof window`;
    заменено на `isPlatformBrowser(this.platformId)` как единый стиль
  проекта.
- **Welcome один раз:** новый ключ `WELCOME_SEEN_STORAGE_KEY`
  (`layout/welcome-seen-storage-key.constant.ts`, значение `lh_welcome_seen`).
  `LayoutComponent` читает флаг через `LocalStorageService` при создании
  (на сервере — всегда `false`, пререндер не ломается) и гейтит им
  `showWelcome$`. Первое пролистывание (`onWelcomeScroll`) сохраняет флаг;
  в текущей сессии компонент остаётся в DOM с классом `.scroll`, чтобы
  доиграть анимацию ухода.

### 3.-5 Управление поселением: роли, заявки, владение, контакты, админка

> Ветка `feat/settlement-management` = `main` + влитая `feat/settlement-roles-ownership`.
> Главная жалоба была не в отсутствии функций, а в попапах: страница поселения
> дёргала owner-only эндпоинты у обычного жителя, и на каждый 403/404
> `errorInterceptor` показывал алерт.

**Почему попапы нельзя было убрать одним `catchError`.** `errorInterceptor`
(`core/interceptors/error.interceptor.ts`) для GET-запросов сам открывает алерт и
возвращает `EMPTY` — к моменту, когда ошибка доходит до компонента, алерт уже
показан. Лечится двумя слоями, и одного мало:

1. `new HttpContext().set(SKIP_ERROR_ALERT, true)` на все GET-ы, доступные не
   всем: `getSentInvitations`, `getJoinRequests$`, `getMyJoinRequests$`,
   `getRequestSettlementStatus$`, `getSettlementInfo`. Для этого у методов
   появился опциональный параметр `context?: HttpContext`.
2. Гейт по праву **перед подпиской**: стрим не запускается, если права нет. Без
   первого слоя гонка при смене владельца всё равно дала бы 403; без второго
   запрос уходил бы зря.

**Аудит вспомогательных GET (следующий этап той же борьбы с попапами).**
Цель: у рядового пользователя не остаётся алертов на фоновых GET-ах, чьи
потребители и так деградируют молча. Правило прежнее: `catchError` в
компоненте не спасает — алерт ставит `errorInterceptor`, поэтому на запрос
вешается `new HttpContext().set(SKIP_ERROR_ALERT, true)`, а у потребителя
проверяется/добавляется catchError, иначе ошибка уйдёт в unhandled.

Покрытые запросы (все с SKIP, потребители ловят ошибку):

- `entities/donate` — `getMyBalance$`, `getMyPurchases$`.
- `entities/referral` — `getMyCode$`, `getMyStats$` (виджет → null/нули).
- `entities/user` — приватный `leaderboardStats$` (топ-200 для тултипов
  player-chip; внутри `getPlayerStats$` уже был catchError → null).
- `entities/settlement-tag` — `getTags$`; в `SettlementTagStore.loadTags$`
  добавлен `catchError(() => of([]))`, без него ошибка летела бы в
  конструктор `settlements.component`.
- `entities/settlement` — `getSettlements` (страница селений и главная
  имеют свои error-состояния, админ-панель ловит в catchError).
- `entities/news` — `getList` (главная ловит → пустой список).
- `entities/discord` — `getMessages$`, `getImages$` (дипломатия/галерея/чат
  имеют собственные error-сигналы; раньше был двойной фидбек: алерт + свой
  стейт). В `game-chat` `watchChat$` catchError внутри `switchMap`, чтобы
  один сбой опроса не убивал polling-поток.
- `core/services/server-information.service` — `getOnlinePlayersCount$`,
  `getTime$`, `getLeaderBoard`, `getPlayerStats$` (шапка → null/прочерк,
  статистика → пустая таблица, профиль → null).

Намеренно оставлены с алертом: админские поверхности (hunger-games,
верификации), `searchUser$` (поиск без результата-ошибки должен сообщать),
POST/PUT/DELETE (фидбек через `RequestStatusService`).

**API-слой (`entities/settlement/api/settlement.service.ts`)** приведён к живой
спеке (`https://docs.lasthearth.ru/v1/openapi.yaml`; `API_CONTRACT.md` по
поселениям обновлён):

- `createJoinRequest$` возвращает `Observable<void>`: `CreateJoinRequestResponse`
  в спеке — пустая схема, идентификатор заявки перечитывается через
  `getMyJoinRequests$`.
- Обязательные поля тела добавлены в `createRole$`, `updateRole$`,
  `assignMemberRole$`, `transferOwnership$`, `updateContactInfo$`,
  `adminAddOwner$`, `adminSetRolesEnabled$`, `createJoinRequest$`,
  `cancelJoinRequest$`. В спеке они `required` в теле, а не только в пути —
  без них `INVALID_ARGUMENT`.
- `revokeInvitation` отправляет тело и отдаёт `{ invitation_ids }`: список
  оставшихся приглашений берётся из ответа, дозапрос не нужен.
- Добавлен `adminUpdateSettlement$` (`PATCH /admin/settlements/{id}`, дипломатия).

**Ключевое ограничение контракта:** эндпоинтов `GET .../roles` и
`GET .../members` **не существует**. Роли и состав приходят только внутри
`Settlement`, а все мутации ролей/владения/контактов возвращают
`{ settlement }` — поэтому страница перерисовывается из ответа мутации
(`runMutation`), без повторного `getSettlementInfo`.

- Хелперы (`entities/settlement/lib/`): `get-member-role-names.function.ts`
  (вынесен из компонента), `permission-label-key.function.ts`,
  `assignable-permissions.constant.ts`, `is-settlement-member.function.ts`.
  `Permission` получил `PERMISSION_UNSPECIFIED` (нулевой элемент proto3-enum),
  но в редакторе ролей он не показывается: колонки матрицы строятся строго по
  `ASSIGNABLE_PERMISSIONS`.
- Новые слайсы `features/settlements/`:
  - `join-request/` — `MyJoinRequestsStore` + `app-join-request-button`.
    Заявка подаётся **на странице `/settlements`**, а не в профиле: список один
    раз тянет `getMyJoinRequests$` и раздаёт карточкам множество
    `settlement_id`. Стор общий для карточки и диалога «Подробнее», поэтому
    после отправки или отзыва они не расходятся. Кнопка не показывается
    неавторизованному и тем, кто уже состоит в поселении
    (`isSettlementMember`); неверифицированному вместо кнопки — подсказка.
  - `settlement-roles/` — матрица прав, диалог роли, диалог ролей участника.
  - `settlement-join-requests/` — панель заявок; ники грузятся **одним**
    батчем `getPlayersBatch$`, пустое состояние приглашает к действию.
  - `settlement-ownership/` — диалог передачи владения. Владение передаётся, а
    не добавляется: число владельцев не растёт, поэтому подтверждение
    необратимости спрашивается вторым шагом.
  - `settlement-contact-info/` — диалог контактов, лимит 512, запрет `<` `>`.
  - `settlement-invitation/` — карточка входящего приглашения вместо сырого
    текста с двумя Tailwind-кнопками. `inviteAccept` раньше вызывался без
    реакции — экран не обновлялся; теперь после accept/reject данные
    перезагружаются.
- Гейтинг: инвайты — `owner ∨ PERMISSION_INVITE_MEMBER`, заявки —
  `owner ∨ PERMISSION_REVIEW_JOIN_REQUEST`, роли/контакты/владение/картинка/
  уровень — только `isOwner`, кик — `isOwner ∨ admin` (по спеке
  `DELETE .../members/{user_id}` требует владельца либо scope
  `settlements:manage`, правом это не покрывается), выход — не-owner либо owner
  при наличии второго.
- `SettlementComponent` переписан с `Observable`-каскада на сигналы: прежний
  `settlementInfo$` внутри `map` запускал вложенную подписку на
  `getPlayersBatch$` и дёргал `detectChanges` — при OnPush это работало, но
  состав и роли жили в изменяемых полях класса.
- **Матрица прав** (`settlement-roles/ui/roles-matrix/`) — единственное место,
  где выбрана нетиповая для проекта форма. Роли — строки, права — столбцы,
  отметка на пересечении: право роли буквально декартово произведение, а не
  список. Разделители hairline на токене `line`, своих поверхностей у строк нет
  — это ведомость, а не карточки. Колонка роли `sticky`: при прокрутке узкого
  экрана отметка без имени роли ничего не сообщает. Сетка растёт при добавлении
  третьего права без правки шаблона. При `roles_enabled === false` вместо
  матрицы одна строка о том, что роли отключены модерацией (не пустая таблица).
- XSS: `role.name` и `contact_info` сервер хранит как есть и не экранирует —
  выводятся **только** интерполяцией `{{ }}`. На клиенте имя роли валидируется
  (1–64, запрет `<` `>`), контакты — 512 и тот же запрет.
- Админка: новый таб «Поселения» (`admin.component.html`, `@case (9)`) и
  `features/admin/ui/settlement-admin-panel/`. Поиск идёт по загруженному
  `GET /settlements` — серверного поиска по поселениям в контракте нет.
  Удаление необратимо и стирает приглашения и заявки, поэтому вынесено в
  `ui/delete-settlement-dialog/` с вводом названия: кнопка активируется только
  при точном совпадении.
- Попутные баги: население больше не завышено на 1 (`members` теперь включает
  владельцев — убраны `members.length + 1` в карточке, диалоге деталей и
  `membersCount`); чтение `attachments[0].url` без optional chaining убрано в
  `settlement.component.html` и `settlement-detailed` (шаблон падал на селении
  с пустым массивом вложений); `settlement-card`, `settlement-detailed` и
  `settlements.component` переведены с `data().leader.user_id` на `getOwnerIds`.
- Тесты (`npm test`, karma+jasmine): `member-has-permission.function.spec.ts` и
  `get-member-role-names.function.spec.ts` — на этих чистых функциях висит весь
  гейтинг, молчаливая регрессия здесь равна показанной кнопке, которой не
  должно быть. 15 спеков проходят.
- `scripts/check-i18n.mjs` — проверка, что каждая ветка словаря есть в обеих
  локалях. Запуск: `node scripts/check-i18n.mjs <файл.i18n.ts>`.

Дипломатия в админке описана `features/admin/config/diplomacy-options.constant.ts`:
`value` — русские литералы, с которыми сопоставляется `getDiplomacyTone`,
`labelKey` — ключ **словаря админки**, потому что на роуте `/profile/admin`
словарь поселений не подгружается.

### 3.-4 Креативная страница 404

> Плоская страница 404 переработана в атмосферную ночную сцену в стиле проекта: последний очаг в пустоши.

- Файлы (`features/not-found/`): `not-found.component.{ts,html,less}`.
- Сцена: тёмный фон на токенах `--lh-night-*` (одинаков в обеих темах), поднимающиеся угли (`.not-found__ember`, 14 шт., разброс по `:nth-child`), дышащее пламя очага за цифрой, тёплый градиент по тексту `404`.
- Интерактив: свет факела (`.not-found__torch`) следует за курсором через CSS-переменные `--torch-x/--torch-y`. Слушатель `pointermove` вешается в `afterNextRender` (нет SSR) и `runOutsideAngular` (не дёргает CD на каждое движение), снимается в `DestroyRef.onDestroy`.
- CTA — базовые `.lh-cta` / `.lh-cta--ghost`; ghost локально перекрашен в пергамент (тёмный `--lh-ink-2` тонул в ночном фоне).
- `prefers-reduced-motion`: угли/факел скрыты, мерцание отключено.
- Переводы уже есть — ветка `notFound.*` в `shared.i18n.ts` (грузится в общих словарях).


### 3.-3 Карточка селения, тултип жителя и цвет тегов

> Переработана иерархия карточки в списке селений; исправлен контраст тултипа игрока (был тёмный текст на тёмном фоне) и цвет тегов в тёмной теме.

- Карточка (`features/settlements/settlement-card/`):
  - Двойная фаска: внешний блок `.settlement-card` — оправа, её падинг (`--card-gap: 0.3125rem`) даёт зазор рамки, `.settlement-card-inner` — пергаментное ядро. Радиус ядра = `calc(--card-radius - --card-gap)`, иначе дуги контуров расходятся. Скругление уменьшено с `1rem` (`rounded-2xl`) до `0.875rem`.
  - Цвет уровня переехал с 4px-полоски поверх карточки на саму оправу (`--card-accent`): полоска читалась как декор и не сообщала, что кодирует. Уровни: лагерь — нейтральная граница, деревня — `--lh-accent-3`, посёлок — `--lh-rank-iron`, город — `--lh-rank-silver`, провинция и закреплённое — `--lh-medal-gold`, гильдия — `--lh-leader`.
  - Уровень стал явным, а не только цветовым: шкала `.settlement-card__tier` рядом с названием — пять засечек, закрашенных до текущего уровня, плюс подпись «4/5» (цвет сам по себе недоступен дальтоникам). Уровень считает `getSettlementTier` (`entities/settlement/lib/`). Гильдия и закреплённое селение шкалу не показывают: у них тип на бэкенде — лагерь, честная шкала дала бы «1/5» у поместья наместника.
  - Третий признак типа — иконка в бейдже (`getSettlementTypeIcon`): `tent` / `house` / `building` / `building-2` / `castle` / `handshake`.
  - Порядок бейджей: тип и дипломатия первыми, сюзеренство и теги после — раньше сюзеренство выдавливало тип во вторую строку.
  - Счётчики населения и онлайна вынесены из ряда бейджей в строку метрик (`.settlement-card__meta`, иконка `@tui.users` + точка статуса): бейдж — классификация, счётчик — метрика.
  - Ховер: подъём на 2px + оправа набирает насыщенность + `scale(1.04)` изображения. Трансформ на оправе, а не на хосте — иначе соседние карточки во flex-раскладке сдвигались. Всё снимается в `prefers-reduced-motion`.
  - `max-h-[400px]` ограничен префиксом `xl:`: ниже этой ширины карточка складывается в колонку, и общий кап резал список жителей и кнопку «Подробнее».
  - `imageUrl()` — computed с optional chaining по `attachments[0]`: у части селений массив вложений пуст, шаблон падал на чтении `.url`.
  - Кнопка тегов и «Подробнее» стали `<button type="button">` (были `div` с `(click)`), у «Подробнее» добавлена стрелка `@tui.arrow-right`.
  - `shared/ui/skeletons/settlement-card-skeleton.component.ts` повторяет двойную фаску и новые радиусы.
- Тултип жителя (`entities/user/ui/player-chip/`):
  - Глобальное правило `tui-hint` в `styles.css` (тёмный фон + белый текст, оба с `!important`) перебивало `data-appearance='lh-player'`, и разметка тултипа красила текст в `--lh-ink` — тёмное по тёмному, ~1.2:1. Правило ограничено `:not([data-appearance='lh-player'])`, а appearance тултипа усилен удвоенным селектором.
  - Роль и статус собраны в один ряд (`.player-tooltip__badges`) — раньше три строки текста были выше аватара и голова тултипа теряла выравнивание. Ширина хоста зафиксирована `min-inline-size: 19rem`, колонки статистики разделены линиями.
- Теги (`entities/settlement-tag/ui/settlement-tag/`):
  - Цвет тега приходит из БД произвольным и раньше шёл прямо в `color` — тёмно-красный тег давал ~1.3:1 в тёмной теме. Теперь цвет прокидывается как `--tag-color`, а фон/текст/обводка выводятся в LESS через `color-mix` с `--lh-ink`, т.е. подстраиваются под тему (замер: 10.6:1 светлая, 5.1:1 тёмная).
  - Добавлен `settlement-tag.component.less`; геометрия бейджа переехала из Tailwind-строки в класс `.settlement-tag`.

### 3.-2 Чип игрока + тултип со статистикой в списках населения

> Три дублировавшихся блока плашек жителей (карточка селения, диалог деталей, страница управления) заменены единым компонентом `app-player-chip`. При наведении — тултип с ленивой статистикой игрока.

- Файлы:
  - `src/app/entities/user/ui/player-chip/player-chip.component.{ts,html,less}` — `app-player-chip`, входы `player`, `isLeader`, `removable`; выход `remove`. Экспортируется из `@entities/user`.
  - `src/app/entities/user/model/i-player-stats.ts` — `IPlayerStats` (ответ `GET /{name}/stats`, StatsService).
  - `UserService.getPlayerStats$(name)` — статистика игрока; при 404 возвращает `null`.
- Дизайн чипа: нейтральная плашка для всех, аватар x48 как ведущий элемент, точка статуса (зелёная/серая), лидер помечен короной `@tui.crown` (не другим фоном). Кнопка кика `@tui.user-round-x` — только на странице управления (`removable`).
- Тултип (`tuiHint`, floating): аватар + имя + статус, ниже — часы/убийства/смерти. Статистика грузится ЛЕНИВО при первом показе тултипа (`tuiHintVisible`), один раз (флаг `statsRequested`), поэтому наведение на 20 чипов не даёт 20 запросов сразу. Игроки вне сервера статистики → «Статистика недоступна».
- Потребители переведены на компонент: `settlement-card`, `settlement-detailed`, `features/settlements/settlement`. Удалены дубли `tui-pulse.online/.offline` + имя из трёх шаблонов.
- Переводы: ветка `settlements.player.*` (ru/en) в `settlements.i18n.ts`.

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
- `src/app/features/home/home.component.{ts,html,less}` — в быстрых действиях добавлена Галерея, убрано Видео.

### 3.6.1 Удалена система тикетов в Discord

> Форма тикета слала заявки напрямую в Discord-вебхук, URL которого лежал
> открытым в `environment.*.ts`. Система удалена целиком; игроки пишут
> в канал #тех-поддержка Discord (так же описано в FAQ).

- Удалены: `features/ticket/` (`ticket-form`, `ticket-fab`),
  `shared/lib/ticket-webhook/`, `core/i18n/translations/features/ticket.i18n.ts`.
- Из `environment.ts` / `environment.prod.ts` убран `discordTicketWebhookUrl`.
- Из потребителей убраны кнопки и код: `home.component` (CTA «Оставить тикет»
  в блоке recruit), `profile-navigation` (кнопка с иконкой `@tui.ticket`).
- Из `translations/index.ts` убрана регистрация `TICKET_I18N`; из
  `home.i18n.ts` — ключ `home.recruit.ticket`.
- Тексты правил (`rules.i18n.ts`), описывающие тикеты в Discord как часть
  игрового процесса, не тронуты — это контент, а не система.

### 3.6.2 FAQ: убран флёрон перед заголовками экспандов

- Из `faq.component.css` удалено правило
  `.faq-scroll > div:first-child > p:first-child::before` (content '❧ ') —
  декоративный флёрон перед заголовком каждого вопроса.
- Chevron-иконки `@tui.chevron-down` в заголовках экспандов остаются —
  они показывают состояние раскрытия (rotate-180).

### 3.6.3 История покупок перенесена во вкладку статистики

> Блок «История покупок» жил в шапке `profile.component` и показывался на всех
> вкладках профиля. Перенесён в `statistics.component` — теперь виден только
> на `/profile/stats`, над лидербордом.

- Шаблон и логика (`purchases$`, `isPurchasesExpanded`, `purchasesCollapsedCount`,
  `getPurchaseStatusMeta`) переехали в
  `features/profile/statistics/statistics.component.{ts,html}`; стили
  `.purchases-list` / `.purchases-toggle-icon` — в `statistics.component.less`.
- Гейт по роли в статистике — `isVerifiedUser` (admin/player); в шапке профиля
  блок и его участие в `isLoading$` удалены, `profile.component.css` очищен.
- Словарь не двигался: ключи `profile.purchases.*` остаются в `profile.i18n.ts`,
  который грузится на роуте профиля (статистика — его дочерний роут).

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
- `scripts/check-i18n.mjs` — проверка полноты обеих локалей в словаре i18n.

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

Внедрена в ветке `design/keep-approved` по итогам ревизии прогона skill
`high-end-visual-design`. Сам прогон целиком лежит в `design/slop-archive`
и в `main` не мержится: принятые приёмы перенесены заново и переписаны,
остальное отброшено.

### 6.3.1 Токены движения и тени

| Токен | Значение | Назначение |
|---|---|---|
| `--lh-ease-smooth` | `cubic-bezier(0.32, 0.72, 0, 1)` | вход панелей и меню |
| `--lh-ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | отклик на нажатие (лёгкий перелёт) |
| `--lh-ease-out-quart` | `cubic-bezier(0.22, 1, 0.36, 1)` | затухание появлений |
| `--lh-dur-fast` / `-mid` / `-slow` | 200 / 450 / 800ms | шкала длительностей |
| `--lh-shadow-soft` / `-lift` | два слоя | покой / приподнятое состояние |

**Правила:**
- Дефолтные `ease`, `ease-in-out`, `ease-out`, `linear` в переходах запрещены.
  Исключение — бесконечные пульсации: там `ease-in-out` даёт симметричное дыхание.
- Кривые Tailwind переопределены в `@theme` (`--default-transition-timing-function`,
  `--ease-*`), поэтому `transition`-утилиты в шаблонах получают проектную физику
  без правки разметки.
- `transition: all` запрещён: он анимирует в том числе `box-shadow` и раскладку,
  что давало дрожание на ховере. Перечислять свойства.
- Тени переопределены в тёмной теме: чернильный оттенок на тёмном фоне не читается.
- `blur()` в появлениях не используется: размытие большого блока заставляет
  композитор перерисовывать слой каждый кадр, а на тексте даёт муар.

### 6.3.2 Поверхности

Все объявлены в `@layer components`, поэтому утилиты Tailwind (`rounded-*`, `p-*`)
перебивают их каскадом — `!important` не нужен.

| Класс | Назначение |
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
