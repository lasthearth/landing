# API_CONTRACT.md — Контракт бэкенда для агентов

> **Источник:** `v1.openapi.yaml` (protobuf-generated)  
> **Базовый URL:** `https://api.lasthearth.ru` (прод) / из `environment.ts`  
> **Версия:** v1  
> **Формат:** JSON, snake_case поля в protobuf-DTO

---

## 1. Общие сведения

### 1.1 Авторизация

Защищённые эндпоинты требуют Bearer-токен в заголовке `Authorization`.  
Токен получается через OIDC (`angular-auth-oidc-client` → Logto).  
Перехватчик `authInterceptor` добавляет токен автоматически ко всем исходящим запросам.

### 1.2 Модель ошибок

Все ошибки возвращают объект `Status` (google.rpc.Status):

```json
{
  "code": 3,
  "message": "INVALID_ARGUMENT: missing required fields",
  "details": []
}
```

| HTTP | gRPC-код | Когда возникает |
|------|----------|-----------------|
| 400 | `INVALID_ARGUMENT` (3) | Невалидные входные данные |
| 401 | `UNAUTHENTICATED` (16) | Отсутствует или невалиден токен |
| 403 | `PERMISSION_DENIED` (7) | Недостаточно прав |
| 404 | `NOT_FOUND` (5) | Ресурс не найден |
| 409 | `ALREADY_EXISTS` (6) | Ресурс уже существует |
| 412 | `FAILED_PRECONDITION` (9) | Бизнес-ограничение (например, недостаточно коинов) |
| 500 | `INTERNAL` (13) | Ошибка базы данных / сервера |

### 1.3 Соглашения по именованию

- **Protobuf-DTO** (приходят с бэкенда): `snake_case` поля.
- **UI-модели** (используются в компонентах): `camelCase` поля.
- **Decimal-значения** (цены, баланс): передаются как `string`, не `number`.
- **Даты**: `ISO 8601` строки в protobuf-DTO; `Date` объекты в UI-моделях.

---

## 2. Сервисы и эндпоинты

### 2.1 DonateService — Донат-валюта и магазин

**Префикс:** `/v1/donate`  
**Frontend:** `entities/donate/api/donate.service.ts`

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/donate/me/balance` | Баланс текущего игрока | ✅ | ✅ `getMyBalance$()` |
| 2 | `GET` | `/donate/me/purchases` | История покупок текущего игрока | ✅ | ✅ `getMyPurchases$()` |
| 3 | `POST` | `/donate/players/{player_id}/coins:add` | Начислить коины (админ) | ✅ + admin | ✅ `addCoins$()` |
| 4 | `POST` | `/donate/players/{player_id}/coins:deduct` | Списать коины (админ) | ✅ + admin | ✅ `deductCoins$()` |
| 5 | `GET` | `/donate/players/{player_id}/purchases` | Покупки игрока (админ) | ✅ + admin | ✅ `getPlayerPurchases$()` |
| 6 | `GET` | `/donate/players/{player_id}/transactions` | Транзакции игрока (админ) | ✅ + admin | ✅ `getPlayerTransactions$()` |
| 7 | `GET` | `/donate/purchases/pending` | Ожидающие выдачи покупки (админ) | ✅ + admin | ✅ `getPendingPurchases$()` |
| 8 | `POST` | `/donate/purchases/{purchase_id}:mark-issued` | Отметить выданной (админ) | ✅ + admin | ✅ `markPurchaseIssued$()` |
| 9 | `POST` | `/donate/purchases/{purchase_id}:refund` | Возврат покупки (админ) | ✅ + admin | ✅ `refundPurchase$()` |
| 10 | `GET` | `/donate/shop/items` | Список товаров магазина | ✅ | ✅ `getShopItems$()` (кэш) |
| 11 | `POST` | `/donate/shop/items` | Создать товар (админ) | ✅ + admin | ❌ |
| 12 | `PUT` | `/donate/shop/items/{id}` | Обновить товар (админ) | ✅ + admin | ❌ |
| 13 | `DELETE` | `/donate/shop/items/{id}` | Удалить товар (админ) | ✅ + admin | ❌ |
| 14 | `POST` | `/donate/shop/items/{item_id}:buy` | Купить товар | ✅ | ✅ `buyItem$()` |

#### DTO

**`ShopItem` (protobuf → UI-модель)**
```ts
interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url: string;    // публичный URL изображения (из MediaService)
  price: string;
  is_available: boolean;
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
  code: string;         // in-game asset code
  item_type: 'ITEM_TYPE_UNSPECIFIED' | 'ITEM_TYPE_ITEM' | 'ITEM_TYPE_KIT';
  entries?: KitEntry[]; // составные части (для ITEM_TYPE_KIT)
  has_discount?: boolean;
  discount_percent?: number;
  effective_price?: string; // итоговая цена с учётом скидки
}
```

**`KitEntry`**
```ts
interface KitEntry {
  name: string;
  description?: string;
  image_url?: string;
  quantity: number;
}
```

**`GetMyBalanceResponse`**
```ts
interface GetMyBalanceResponse {
  coins: string; // decimal as string
}
```



**`Purchase`**
```ts
interface Purchase {
  id: string;
  player_id: string;
  player_name: string;
  item_id: string;
  item_name: string;
  price_paid: string;
  status: string;          // например, "COMPLETED"
  created_at: string;      // ISO 8601
  refunded_at?: string;    // ISO 8601
  issued_at?: string;      // ISO 8601
  issued_by?: string;
  base_price?: string;     // базовая цена до скидки
  discount_percent?: number;
}
```

**`Transaction`**
```ts
interface Transaction {
  id: string;
  player_id: string;
  amount: string;
  type: string;        // "CREDIT" | "DEBIT" и т.д.
  reason?: string;
  purchase_id?: string;
  created_at: string;  // ISO 8601
}
```

**`CreateShopItemRequest`**
```ts
interface CreateShopItemRequest {
  name: string;
  description: string;
  image_url: string;    // public_url из MediaService
  price: string;
  code: string;
  item_type: 'ITEM_TYPE_UNSPECIFIED' | 'ITEM_TYPE_ITEM' | 'ITEM_TYPE_KIT';
  entries?: KitEntry[];
  has_discount?: boolean;
  discount_percent?: number;
}
```

**`UpdateShopItemRequest`**
```ts
interface UpdateShopItemRequest {
  id?: string;
  name?: string;
  description?: string;
  image_url?: string;   // public_url из MediaService; пусто = оставить текущее
  price?: string;
  is_available?: boolean;
  code?: string;
  item_type?: 'ITEM_TYPE_UNSPECIFIED' | 'ITEM_TYPE_ITEM' | 'ITEM_TYPE_KIT';
  entries?: KitEntry[];
  has_discount?: boolean;
  discount_percent?: number;
}
```

#### Маппинг на frontend

```
GET  /donate/me/balance            → DonateService.getMyBalance$()
GET  /donate/shop/items            → DonateService.getShopItems$()     (shareReplay(1))
GET  /donate/shop/items/{id}       → DonateService.getShopItemById$(id)
POST /donate/shop/items            → DonateService.createShopItem$(request)
PUT  /donate/shop/items/{id}       → DonateService.updateShopItem$(id, request)
DELETE /donate/shop/items/{id}     → DonateService.deleteShopItem$(id)
POST /donate/shop/items/{id}:buy   → DonateService.buyItem$(itemId)
```

---

### 2.2 HungerGamesService — Голодные игры

**Префикс:** `/v1/hungergames`  
**Frontend:** `entities/hunger-games/api/hunger-games.service.ts` (админ) + `features/hunger-games/api/hunger-games.service.ts` (чтение)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/hungergames/leaderboard` | Текущий лидерборд | — | ✅ оба сервиса |
| 2 | `POST` | `/hungergames/match` | Записать результат матча | ✅ + admin | ✅ `recordMatch$()` |
| 3 | `POST` | `/hungergames/season` | Создать новый сезон | ✅ + admin | ✅ `createSeason$()` |
| 4 | `POST` | `/hungergames/season/reset` | Завершить сезон + награды | ✅ + admin | ✅ `resetSeason$()` |
| 5 | `GET` | `/hungergames/seasons` | История сезонов | — | ✅ `getSeasons$()` |
| 6 | `GET` | `/hungergames/seasons/{season_id}/leaderboard` | Лидерборд завершённого сезона | — | ✅ `getSeasonLeaderboard$()` |
| 7 | `GET` | `/hungergames/seasons/{season_id}/players/{player_id}` | Статистика игрока в сезоне | — | ✅ `getPlayerSeasonStats$()` (features) |

#### DTO

**`LeaderboardEntry`**
```ts
interface LeaderboardEntry {
  name: string;
  deaths: number;
  kills: number;
  hours_played: number;
  user_id: string;
}
```

**`SeasonInfo`**
```ts
interface SeasonInfo {
  id: string;
  number: number;
  started_at: string; // ISO 8601
  ended_at?: string;  // ISO 8601; отсутствует = активен
}
```

**`SeasonResultEntry`**
```ts
interface SeasonResultEntry {
  player_id: string;
  player_name: string;
  elo: number;
  wins: number;
  kills: number;
  rank: number;        // 0 для активного сезона
  reward_coins: string;
}
```

**`RecordMatchRequest`**
```ts
interface PlayerMatchResult {
  player_id: string;
  player_name: string;
  place: number;       // 1-based
  kills: number;
}
interface RecordMatchRequest {
  players: PlayerMatchResult[]; // минимум 2
}
```

**`ResetSeasonRequest`**
```ts
interface SeasonReward {
  rank: number;   // 1-based
  coins: string;
}
interface ResetSeasonRequest {
  rewards: SeasonReward[];
}
```

---

### 2.3 KitService — Игровые киты

**Префикс:** `/v1/kits`  
**Frontend:** ❌ Нет выделенного сервиса (эндпоинты не реализованы на фронте)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/kits` | Список доступных китов | — | ❌ |
| 2 | `POST` | `/kits/{kit_name}:assign` | Назначить кит пользователю | ✅ + admin | ❌ |
| 3 | `GET` | `/users/{user_id}/kits/assignments` | Список назначений китов пользователя | ✅ (self) | ❌ |

#### DTO

**`GetAvailableKitsResponse`**
```ts
interface GetAvailableKitsResponse {
  kits: string[]; // массив имён китов
}
```

**`AssignKitToUserRequest`**
```ts
interface AssignKitToUserRequest {
  user_id: string;
  user_game_name: string;
  kit_name: string;
}
```

**`Assignment`**
```ts
interface Assignment {
  id: string;
  user_id: string;
  kit_name: string;
  status: string;       // например, "PENDING", "DELIVERED", "CLAIMED"
  user_game_name: string;
  assigned_at: string;  // ISO 8601
  delivered_at?: string;
  claimed_at?: string;
}
```

---

### 2.4 LeaderboardService — Общий лидерборд

**Префикс:** `/v1/leaderboard`  
**Frontend:** `services/server-information.service.ts` (легаси, смешанный сервис)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/leaderboard?filter=&limit=` | Лидерборд по фильтру | — | ✅ `ServerInformationService.getLeaderBoard()` |

#### DTO

**`LeaderboardResponse`**
```ts
interface LeaderboardEntry {
  name: string;
  deaths: number;
  kills: number;
  hours_played: number;
  user_id: string;
}
interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}
```

- `filter`: `integer` (enum); по умолчанию сортировка по убийствам.
- `limit`: максимум записей; по умолчанию 25.

---

### 2.5 NewsService — Новости

**Префикс:** `/v1/news`  
**Frontend:** `entities/news/api/news.api.ts` (новый FSD) + `services/news.service.ts` (легаси)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/news?page_size=&page_token=` | Список новостей | — | ✅ `NewsApiService.getList()` |
| 2 | `POST` | `/news` | Создать новость | ✅ + admin | ✅ `NewsApiService.create()` / `NewsService.createNews$()` |
| 3 | `GET` | `/news/{id}` | Новость по ID | — | ✅ `NewsApiService.getById(id)` |
| 4 | `DELETE` | `/news/{id}` | Удалить новость | ✅ + admin | ✅ `NewsApiService.delete(id)` |

#### DTO

**`News`**
```ts
interface News {
  id: string;
  title: string;
  content: string;
  preview: string;      // публичный URL изображения (из MediaService)
  view_count: string;   // int64 as string
  created_at: string;   // ISO 8601
  created_by: string;
}
```

**`CreateNewsRequest`**
```ts
interface CreateNewsRequest {
  title: string;
  content: string;
  preview: string;      // public_url из MediaService
}
```

**`ListNewsResponse`**
```ts
interface ListNewsResponse {
  news: News[];
  next_page_token?: string;
}
```

- `page_size`: по умолчанию 15, максимум 50.
- При каждом `GET` счётчик просмотров инкрементируется.

---

### 2.6 NotificationService — Уведомления

**Префикс:** `/v1/notifications`  
**Frontend:** ❌ Нет API-сервиса (есть только UI-агрегатор `core/services/notification.service.ts`)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/notifications?page_size=&page_token=&order_by=` | Список уведомлений | ✅ | ❌ |
| 2 | `POST` | `/notifications/{id}:markAsRead` | Прочитать уведомление | ✅ | ❌ |

#### DTO

**`Notification`**
```ts
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  state: number;        // enum as int32
  created_at: string;   // ISO 8601
}
```

**`ListNotificationsResponse`**
```ts
interface ListNotificationsResponse {
  notifications: Notification[];
  next_page_token?: string;
}
```

- `page_size`: по умолчанию 15, максимум 15.
- `order_by`: `"created_at"`, `"state"` + `" asc"` / `" desc"`; по умолчанию `"created_at desc"`.

---

### 2.7 RuleService — Вопросы о правилах

**Префикс:** `/v1/rules`  
**Frontend:** `services/server-information.service.ts` (легаси, смешанный)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `POST` | `/rules/question` | Создать вопрос (админ) | ✅ + admin | ✅ `ServerInformationService.postQuestion()` |
| 2 | `DELETE` | `/rules/question/{id}` | Удалить вопрос (админ) | ✅ + admin | ❌ |
| 3 | `GET` | `/rules/questions?count=` | Случайные вопросы для верификации | — | ✅ `ServerInformationService.getQuestions$()` |
| 4 | `GET` | `/rules/questions/list` | Все вопросы (админ) | ✅ + admin | ❌ |

#### DTO

**`GetRandomQuestionsResponse_Question`**
```ts
interface RandomQuestion {
  id: string;
  question: string;
}
```

**`ListQuestionsResponse_Question`**
```ts
interface AdminQuestion {
  id: string;
  question: string;
  created_by: string;
  created_at: string; // ISO 8601
}
```

- `count`: по умолчанию 5.

---

### 2.8 ServerInfoService — Информация о сервере

**Префикс:** `/v1/serverinfo`  
**Frontend:** `services/server-information.service.ts` (частично) / `core/services/server-information.service.ts`

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/serverinfo/totalonline` | Текущий и максимальный онлайн | — | ✅ `getOnlinePlayersCount$()` |
| 2 | `GET` | `/serverinfo/worldtime` | Игровое время мира | — | ✅ `getTime$()` |

#### DTO

**`TotalOnlineResponse`**
```ts
interface TotalOnlineResponse {
  online: number;
  max_online: number;
}
```

**`WorldTimeResponse`**
```ts
interface WorldTimeResponse {
  time: string;
}
```

---

### 2.9 SettlementService — Поселения

**Префикс:** `/v1/settlements`  
**Frontend:** `entities/settlement/api/settlement.service.ts`

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/settlements` | Список одобренных поселений | — | ✅ `getSettlements()` |
| 2 | `POST` | `/settlements` | Подать/повысить заявку на поселение | ✅ | ✅ `postRequestSettlement$()` |
| 3 | `POST` | `/settlements/invitations/{invitation_id}:accept` | Принять приглашение | ✅ | ✅ `inviteAccept()` |
| 4 | `POST` | `/settlements/invitations/{invitation_id}:reject` | Отклонить приглашение | ✅ | ✅ `rejectAccept()` |
| 5 | `GET` | `/settlements/verifications` | Ожидающие заявки (админ) | ✅ + admin | ✅ `getSettlementsRequests$()` |
| 6 | `GET` | `/settlements/{id}` | Поселение по ID | — | ✅ `getSettlementById()` |
| 7 | `POST` | `/settlements/{id}/verification:approve` | Одобрить заявку (админ) | ✅ + admin | ✅ `postVerifySettlementApprove()` |
| 8 | `POST` | `/settlements/{id}/verification:reject` | Отклонить заявку (админ) | ✅ + admin | ✅ `postVerifySettlementReject()` |
| 9 | `GET` | `/settlements/{settlement_id}/invitations` | Приглашения поселения (лидер) | ✅ | ✅ `getSentInvitations()` |
| 10 | `POST` | `/settlements/{settlement_id}/invitations` | Пригласить игрока (лидер) | ✅ | ✅ `invitePlayer()` |
| 11 | `POST` | `/settlements/{settlement_id}/invitations/{invitation_id}:revoke` | Отозвать приглашение (лидер) | ✅ | ✅ `revokeInvitation()` |
| 12 | `DELETE` | `/settlements/{settlement_id}/members/{user_id}` | Исключить участника (админ) | ✅ + admin | ✅ `settlementLeave$()` |
| 13 | `POST` | `/settlements/{settlement_id}/tags` | Добавить тег (tags:manage) | ✅ + privilege | ✅ `postSettlementTags()` |
| 14 | `DELETE` | `/settlements/{settlement_id}/tags/{tag_id}` | Удалить тег (tags:manage) | ✅ + privilege | ❌ |
| 15 | `GET` | `/users/{user_id}/settlements` | Поселение пользователя | — | ✅ `getSettlementInfo()` |
| 16 | `GET` | `/users/{user_id}/settlements/invitations` | Приглашения пользователя | ✅ (self) | ✅ `UserService.getInvitations$()` |
| 17 | `GET` | `/users/{user_id}/settlements/verification:status` | Статус заявки пользователя | — | ✅ `getRequestSettlementStatus$()` |

#### DTO

**`Settlement`**
```ts
interface Settlement {
  id: string;
  name: string;
  type: number;           // enum as int32 (0=CAMP, 1=CITY, 2=FORTRESS, 3=CAPITAL)
  description: string;
  diplomacy: string;
  leader: Member;
  members: Member[];
  attachments: Attachment[];
  coordinates: Vector2;
  created_at: string;
  updated_at: string;
  tags: TagReference[];
}

interface Member {
  user_id: string;
}

interface Attachment {
  desc: string;
  url: string;
}

interface Vector2 {
  x: number;
  y: number;
}

interface TagReference {
  id: string;
}
```

**`SubmitRequest`**
```ts
interface SubmitAttachment {
  url: string;         // public_url из MediaService
  description: string;
}
interface SubmitRequest {
  type: number;
  name: string;
  description: string;
  diplomacy: string;
  coordinates: Vector2;
  attachments: SubmitAttachment[];
}
```

**`RejectRequest`**
```ts
interface RejectRequest {
  id: string;
  rejection_reason: string;
}
```

---

### 2.10 SettlementTagService — Теги поселений

**Префикс:** `/v1/settlements/tags`  
**Frontend:** ❌ Нет выделенного сервиса (частично в `SettlementService`)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/settlements/tags` | Список всех тегов | — | ❌ |
| 2 | `POST` | `/settlements/tags` | Создать тег (tags:create) | ✅ + privilege | ❌ |
| 3 | `GET` | `/settlements/tags/{tag_id}` | Тег по ID | — | ❌ |
| 4 | `DELETE` | `/settlements/tags/{tag_id}` | Soft-delete тега (tags:delete) | ✅ + privilege | ❌ |
| 5 | `POST` | `/settlements/tags:batch` | Batch-получение тегов по IDs | — | ❌ |

#### DTO

**`SettlementTag`**
```ts
interface Color {
  red: number;    // [0, 1]
  green: number;  // [0, 1]
  blue: number;   // [0, 1]
  alpha?: number; // [0, 1]; default = 1.0
}

interface SettlementTag {
  id: string;
  name: string;
  color: Color;
  description?: string;
}
```

**`GetTagsByIdsRequest`**
```ts
interface GetTagsByIdsRequest {
  tag_ids: string[];
}
```

---

### 2.11 StatsService — Статистика

**Префикс:** `/v1/stats`, `/{name}/stats`  
**Frontend:** ❌ Нет выделенного сервиса

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/stats?filter=&started_at=` | Онлайн-статистика | — | ❌ |
| 2 | `GET` | `/{name}/stats` | Статистика игрока по нику | — | ❌ |

#### DTO

**`OnlineStatsResponse`**
```ts
interface OnlineStatsResponse {
  count: number; // int32
}
```

**`PlayerStatsResponse`**
```ts
interface PlayerStatsResponse {
  name: string;
  death_count: number;
  hours_played: number;
  last_online: string;
  players_killed: number;
}
```

---

### 2.12 TrademarketService — Торговля

**Префикс:** `/v1/items`  
**Frontend:** ❌ Не реализован

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `POST` | `/items` | Создать предмет торговли | ✅ | ❌ |

#### DTO

**`CreateRequest`**
```ts
interface CreateRequest {
  name: string;
}
```

**`CreateResponse`**
```ts
interface CreateResponse {
  id: string;
}
```

---

### 2.13 UserService — Пользователи

**Префикс:** `/v1/users`  
**Frontend:** `entities/user/api/user.service.ts`

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/users/search?query=` | Поиск пользователей | — | ✅ `SettlementService.searchUser$()` ⚠️ *в `SettlementService`* |
| 2 | `GET` | `/users/{user_id}` | Профиль пользователя | — | ✅ `getPlayer$()` |
| 3 | `POST` | `/users/{user_id}/avatar` | Обновить аватар (self) | ✅ (self) | ✅ `setProfileImage$()` |
| 4 | `PUT` | `/users/{user_id}/nickname` | Сменить ник (self, cooldown 6м) | ✅ (self) | ✅ `changeUsername$()` |

#### DTO

**`User`**
```ts
interface UserImage {
  original: string;
  x96: string;
  x48: string;
}

interface User {
  user_id: string;
  user_game_name: string;
  avatar: UserImage;
  user_name: string;
  previous_nickname?: string;
  is_online: boolean;
}
```

**`ChangeNicknameRequest`**
```ts
interface ChangeNicknameRequest {
  user_id: string;
  new_nickname: string; // 1-15 символов: a-zA-Z0-9_-
}
```

**`UpdateAvatarRequest`**
```ts
interface UpdateAvatarRequest {
  user_id: string;
  avatar: string;  // base64 (bytes). ⚠️ Аватар — исключение, пока не через MediaService.
}
```

> **Примечание по аватару:** в отличие от новостей, товаров магазина и поселений, эндпоинт `/users/{user_id}/avatar` пока принимает изображение как base64 внутри JSON. На фронте `UserService.setProfileImage$()` принимает `File`, конвертация в base64 происходит внутри сервиса.

**`SearchUsersResponse`**
```ts
interface SearchUsersResponse {
  users: User[];
}
```

---

### 2.14 VerificationService — Верификация игроков

**Префикс:** `/v1/verification`  
**Frontend:** `features/verification/api/verification.service.ts` + `services/server-information.service.ts` (легаси)

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `GET` | `/user/verify/{user_game_name}/status` | Статус верификации по игровому нику | — | ❌ |
| 2 | `POST` | `/verification` | Подать заявку на верификацию | ✅ | ✅ `postVerifyUser()` |
| 3 | `GET` | `/verification/details` | Детали своей верификации | ✅ | ✅ `getDetails()` |
| 4 | `POST` | `/verification/{user_id}/approve` | Одобрить заявку (админ) | ✅ + admin | ✅ `postVerifySuccess()` |
| 5 | `POST` | `/verification/{user_id}/reject` | Отклонить заявку (админ) | ✅ + admin | ✅ `postVerifyDeny()` |
| 6 | `GET` | `/verifications` | Список ожидающих (админ) | ✅ + admin | ✅ `getVerifyRequests()` |
| 7 | `GET` | `/users/{user_id}/verification:status` | Статус верификации по ID | — | ❌ |

#### DTO

**`VerifyStatusResponse`**
```ts
interface VerifyStatusResponse {
  status: string; // "pending" | "approved" | "rejected" | "verified"
}
```

**`DetailsResponse`**
```ts
interface DetailsResponse {
  id: string;
  status: string;
  rejection_reason?: string;
}
```

**`SubmitRequest`** (Verification)
```ts
interface VerificationSubmitRequest {
  // Поля зависят от реализации бэкенда;
  // смотри features/verification/model/i-verify-data.ts
}
```

**`RejectRequest_RejectReason`**
```ts
interface RejectReason {
  rejection_reason: string;
}
```

---

### 2.15 MediaService — Загрузка файлов (presigned URLs)

**Префикс:** `/v1/media`  
**Frontend:** `entities/media/api/media.service.ts`

| # | Метод | Путь | Описание | Auth | Реализовано |
|---|-------|------|----------|------|-------------|
| 1 | `POST` | `/media/upload-urls` | Получить presigned-цели для загрузки | ✅ | ❌ |

#### DTO

**`CreateUploadUrlsRequest`**
```ts
interface CreateUploadUrlsRequest {
  purpose: 'UPLOAD_PURPOSE_UNSPECIFIED'
         | 'UPLOAD_PURPOSE_DONATE_SHOP'
         | 'UPLOAD_PURPOSE_SETTLEMENT'
         | 'UPLOAD_PURPOSE_NEWS';
  count: number;           // [1, 20]
  content_type?: string;   // например "image/webp"; пусто → image/* + .webp
}
```

**`UploadTarget`**
```ts
interface UploadTarget {
  post_url: string;                 // S3-presigned POST endpoint
  fields: Record<string, string>;   // policy, signature, key, bucket, ...
  public_url: string;               // итоговый публичный URL файла
}
```

**`CreateUploadUrlsResponse`**
```ts
interface CreateUploadUrlsResponse {
  targets: UploadTarget[];
}
```

#### Процесс загрузки файла

1. **Получить цель:** `POST /v1/media/upload-urls` с `purpose` и `count=1`.
2. **Сформировать FormData:**
   ```ts
   const form = new FormData();
   for (const [k, v] of Object.entries(target.fields)) {
     form.append(k, v);
   }
   form.set('Content-Type', file.type); // например "image/webp"
   form.append('file', file);           // ОБЯЗАТЕЛЬНО последним!
   ```
3. **Отправить файл:** `POST target.post_url` с `{ body: form }`.
   - **БЕЗ** `Authorization: Bearer …` — подпись в полях формы сама авторизует.
   - Успех = **HTTP 204 No Content**, тела нет.
4. **Использовать URL:** `target.public_url` передаётся в нужный домен:
   - `DonateService` → `CreateShopItemRequest.image_url` / `UpdateShopItemRequest.image_url`
   - `NewsService` → `CreateNewsRequest.preview`
   - `SettlementService` → `SubmitRequest.attachments[].url`

#### Ограничения
- Размер файла: **1..5 MiB** (зашито в policy).
- `Content-Type` должен начинаться с `image/`.
- Поле `file` должно быть **строго последним** в теле запроса (требование S3).

---

## 3. Сводная таблица реализации

### 3.1 По слоям FSD

| Сервис (backend) | FSD-слайс | API-сервис на фронте | Статус |
|------------------|-----------|----------------------|--------|
| DonateService | `entities/donate` | `DonateService` | **Частично** (~86%) |
| HungerGamesService | `entities/hunger-games` + `features/hunger-games` | `HungerGamesService` (×2) | **Частично** (~86%) |
| KitService | — | — | **Не реализован** |
| LeaderboardService | — | `ServerInformationService` (легаси) | **Легаси** |
| NewsService | `entities/news` | `NewsApiService` + `NewsService` (легаси) | **Частично** |
| NotificationService | — | — | **Не реализован** |
| RuleService | — | `ServerInformationService` (легаси) | **Легаси, частично** |
| ServerInfoService | `core/services` | `ServerInformationService` / `ServerInfoService` | **Готово** |
| SettlementService | `entities/settlement` | `SettlementService` | **Частично** (~83%) |
| SettlementTagService | — | — | **Не реализован** |
| MediaService | `entities/media` | `MediaService` | **Готово** |
| StatsService | — | — | **Не реализован** |
| TrademarketService | — | — | **Не реализован** |
| UserService | `entities/user` | `UserService` | **Частично** (~60%) |
| VerificationService | `features/verification` | `VerificationService` + легаси | **Частично** (~71%) |

### 3.2 Что реализовано ✅

**Donate:**
- Баланс, история покупок, список товаров, покупка товара.
- Админ: начисление/списание коинов, история покупок/транзакций игрока, возврат.
- Админ: создание/обновление/удаление товаров магазина (с `image_url` из MediaService).
- UI: `features/admin/ui/donate-shop-panel/donate-shop-panel.component.ts` — вкладка в админке.

**Hunger Games:**
- Лидерборд текущего и завершённых сезонов.
- Список сезонов, текущий сезон.
- Админ: создание сезона, сброс сезона, запись матча.
- Статистика игрока в сезоне (`features/hunger-games`).

**News:**
- Получение списка, получение по ID, создание, удаление (`entities/news`).
- Создание новости (`features/news/components/create-news-form`) загружает превью через MediaService.

**Settlements:**
- CRUD поселений, приглашения (create/accept/reject/revoke/list).
- Верификация поселений (approve/reject/list).
- Управление участниками (remove).
- Частично: теги (только добавление).

**Server Info:**
- Онлайн и игровое время.

**User:**
- Профиль по ID, смена ника, обновление аватара.
- Поиск пользователей (но в `SettlementService` — легаси).
- OIDC-авторизация и токены.

**Verification:**
- Подача заявки, детали, одобрение/отклонение, список ожидающих.

### 3.3 Что НЕ реализовано ❌

| Приоритет | Что не хватает | Где должно жить по FSD |
|-----------|----------------|------------------------|
| **Высокий** | `NotificationService` — уведомления пользователей (`/notifications`) | `entities/notification` или `features/notification` |
| **Высокий** | `SettlementTagService` — полный CRUD тегов + batch | `entities/settlement-tag` |

| **Средний** | `KitService` — киты и назначения | `entities/kit` или `features/admin` |
| **Средний** | `StatsService` — статистика игроков и онлайна | `entities/stats` |
| **Средний** | `UserService.searchUsers$` — вынести из `SettlementService` в `entities/user` | `entities/user` |
| **Низкий** | `TrademarketService` — создание предмета торговли | `features/market` или `entities/trademarket` |
| **Низкий** | `RuleService` — delete question, list all questions | `entities/rule-question` |
| **Низкий** | `VerificationService` — статус по имени (`/user/verify/{name}/status`) | `features/verification` |
| **Техдолг** | `ServerInformationService` — смешивает 4 разных домена (serverinfo, leaderboard, rules, verification). Нужно распилить. | `core/services` → разные слои |
| **Техдолг** | `NewsService` (легаси в `services/`) — содержит хардкод новостей и дублирует `NewsApiService`. Удалить после полного перехода на API. | `services/news.service.ts` |
| **Техдолг** | `PROJECT_MAP.md` отсутствует, хотя `AGENTS.md` требует его изучения. | Корень проекта |

### 3.4 Дублирование сервисов

Некоторые домены имеют **два сервиса** (легаси + FSD):

| Домен | Легаси | FSD | Рекомендация |
|-------|--------|-----|--------------|
| Hunger Games | `features/hunger-games/api/hunger-games.service.ts` | `entities/hunger-games/api/hunger-games.service.ts` | `features` — только чтение; `entities` — админ. Не конфликтуют, но стоит переименовать `features` → `HungerGamesPublicService`. |
| News | `services/news.service.ts` | `entities/news/api/news.api.ts` | Легаси удалить после полного перехода на API-новости. |
| Verification | `services/server-information.service.ts` | `features/verification/api/verification.service.ts` | Легаси содержит старые методы с ручными заголовками. Перенести всё в `features/verification`. |

---

## 4. Примечания для агентов

1. **Всегда использовать `environment.apiUrl`** вместо хардкода `https://api.lasthearth.ru/v1`.
2. **Всегда использовать DTO-интерфейсы** из `entities/*/model/` и мапперы для преобразования в UI-модели.
3. **Не создавать новых `HttpHeaders` с Bearer вручную** — `authInterceptor` делает это автоматически. Исключение: файлы, которые ещё не переведены на interceptor (см. легаси `ServerInformationService`).
4. **Для пагинации** использовать `page_token` / `next_page_token` (News, Notifications, Donate pending purchases), а не offset/limit.
5. **Decimal-поля** (`coins`, `price`, `reward_coins`) — всегда `string` в DTO и `string` в UI-моделях (не преобразовывать в `number`).
6. **При создании нового API-сервиса** следовать структуре FSD: `entities/<domain>/api/<domain>.service.ts`, `model/<domain>.types.ts`, `model/<domain>.mapper.ts`, `index.ts`.
7. **Загрузка файлов** всегда через `MediaService` (`/v1/media/upload-urls`) → `multipart/form-data POST` на `post_url` → полученный `public_url` передаётся в `image_url` / `preview` / `attachments[].url`. Никогда не отправлять `Authorization` на `post_url`.
