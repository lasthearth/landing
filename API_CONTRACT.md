# API_CONTRACT.md — Контракт бэкенда Last Hearth API

> **Источник:** `v1.openapi.yaml.txt` (protoc-gen-openapi)  
> **Base URL:** `https://api.lasthearth.ru`  
> **Версия:** v1

---

## 1. Общие сведения

| Параметр | Значение |
|----------|----------|
| **Протокол** | REST over HTTPS |
| **Формат** | JSON |
| **Спецификация** | OpenAPI 3.0.3 (сгенерирована из protobuf) |
| **Аутентификация** | Bearer token (OIDC через `angular-auth-oidc-client`) |
| **Интерцептор** | `authInterceptor` добавляет `Authorization: Bearer <token>` |

### 1.1 Стандартные ошибки

Все ошибки возвращают схему `Status` (Google RPC):

```json
{
  "code": 16,
  "message": "UNAUTHENTICATED",
  "details": []
}
```

| HTTP | gRPC Code | Значение |
|------|-----------|----------|
| 400 | 3 | INVALID_ARGUMENT |
| 401 | 16 | UNAUTHENTICATED |
| 403 | 7 | PERMISSION_DENIED |
| 404 | 5 | NOT_FOUND |
| 409 | 6 | ALREADY_EXISTS |
| 500 | 13 | INTERNAL |

**Правило для фронтенда:** парсить `message` и показывать через `NotificationService`.

### 1.2 Типы данных — особенности protobuf→JSON

- `enum` → `integer` (не строка!). Например, `type` у Settlement — число.
- `int64`, `uint64`, `decimal` → `string` (чтобы не терять точность). Например, `coins`, `price`, `view_count`.
- `bytes` → base64-строка. Например, `preview` в `CreateNewsRequest`.
- `Timestamp` → ISO 8601 строка (`date-time` format).

### 1.3 Пагинация

- `ListNews`, `ListNotifications`, `ListSeasons` используют `page_token` / `next_page_token`.
- `ListSeasons` использует `next` (cursor).

---

## 2. Сервисы и эндпоинты

### 2.1 SettlementService (17 эндпоинтов)

> Домен: поселения, члены, приглашения, верификация, теги.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/settlements` | Список всех поселений |
| `POST`| `/v1/settlements` | Создать поселение |
| `GET` | `/v1/settlements/{id}` | Получить поселение по ID |
| `GET` | `/v1/settlements/verifications` | Список на модерации (admin) |
| `POST`| `/v1/settlements/{id}/verification:approve` | Одобрить верификацию |
| `POST`| `/v1/settlements/{id}/verification:reject` | Отклонить верификацию |
| `POST`| `/v1/settlements/{settlement_id}/invitations` | Пригласить игрока |
| `POST`| `/v1/settlements/invitations/{invitation_id}:accept` | Принять приглашение |
| `POST`| `/v1/settlements/invitations/{invitation_id}:reject` | Отклонить приглашение |
| `POST`| `/v1/settlements/{settlement_id}/invitations/{invitation_id}:revoke` | Отозвать приглашение |
| `DELETE`| `/v1/settlements/{settlement_id}/members/{user_id}` | Удалить члена |
| `GET` | `/v1/users/{user_id}/settlements` | Поселения пользователя |
| `GET` | `/v1/users/{user_id}/settlements/invitations` | Приглашения пользователя |
| `GET` | `/v1/users/{user_id}/settlements/verification:status` | Статус верификации поселения юзера |

### 2.2 SettlementTagService (5 эндпоинтов)

> Административное управление тегами поселений.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/settlements/tags` | Список тегов |
| `POST`| `/v1/settlements/tags` | Создать тег |
| `GET` | `/v1/settlements/tags/{tag_id}` | Получить тег |
| `DELETE`| `/v1/settlements/tags/{tag_id}` | Удалить тег |
| `POST`| `/v1/settlements/tags:batch` | Batch-операции с тегами |
| `POST`| `/v1/settlements/{settlement_id}/tags` | Добавить тег к поселению |
| `DELETE`| `/v1/settlements/{settlement_id}/tags/{tag_id}` | Удалить тег у поселения |

### 2.3 DonateService (12 эндпоинтов)

> Игровая валюта, магазин, покупки, транзакции.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/donate/me/balance` | Баланс текущего игрока |
| `GET` | `/v1/donate/me/purchases` | История покупок |
| `GET` | `/v1/donate/shop/items` | Список товаров |
| `GET` | `/v1/donate/shop/items/{id}` | Товар по ID |
| `POST`| `/v1/donate/shop/items/{item_id}:buy` | Купить товар |
| `POST`| `/v1/donate/players/{player_id}/coins:add` | Начислить монеты (admin). Body: `{ amount, player_name }` |
| `POST`| `/v1/donate/players/{player_id}/coins:deduct` | Списать монеты (admin). Body: `{ amount }` |
| `GET` | `/v1/donate/players/{player_id}/purchases` | Покупки игрока (admin) |
| `GET` | `/v1/donate/players/{player_id}/transactions` | Транзакции игрока |
| `POST`| `/v1/donate/purchases/{purchase_id}:refund` | Возврат покупки |

### 2.4 UserService (4 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/users/{user_id}` | Профиль пользователя |
| `POST`| `/v1/users/{user_id}/nickname` | Сменить ник |
| `POST`| `/v1/users/{user_id}/avatar` | Обновить аватар |
| `GET` | `/v1/users/search` | Поиск пользователей |

### 2.5 VerificationService (7 эндпоинтов)

> Верификация игроков (вопросы, статус, модерация).

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/verification/details` | Детали верификации текущего юзера |
| `GET` | `/v1/verifications` | Список на верификацию (admin) |
| `POST`| `/v1/verification/{user_id}/approve` | Одобрить верификацию |
| `POST`| `/v1/verification/{user_id}/reject` | Отклонить верификацию |
| `GET` | `/v1/users/{user_id}/verification:status` | Статус верификации |
| `GET` | `/v1/user/verify/{user_game_name}/status` | Статус по игровому имени |

### 2.6 RuleService (4 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/rules/questions` | Список вопросов |
| `GET` | `/v1/rules/questions/list` | Список для админа |
| `POST`| `/v1/rules/question` | Создать вопрос |
| `DELETE`| `/v1/rules/question/{id}` | Удалить вопрос |
| `GET` | `/v1/rules/question/{id}` | Получить вопрос |

### 2.7 NewsService (4 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/news` | Список новостей (paginated) |
| `GET` | `/v1/news/{id}` | Новость по ID |
| `POST`| `/v1/news` | Создать новость (admin) |
| `DELETE`| `/v1/news/{id}` | Удалить новость |

### 2.8 KitService (3 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/kits` | Доступные киты |
| `POST`| `/v1/kits/{kit_name}:assign` | Назначить кит пользователю |
| `GET` | `/v1/users/{user_id}/kits/assignments` | Назначенные киты |

### 2.9 HungerGamesService (7 эндпоинтов)

> Голодные игры: сезоны, ELO, таблица лидеров.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/hungergames/season` | Текущий сезон |
| `GET` | `/v1/hungergames/seasons` | История сезонов |
| `POST`| `/v1/hungergames/season` | Создать сезон (admin) |
| `POST`| `/v1/hungergames/season/reset` | Сбросить сезон (admin) |
| `POST`| `/v1/hungergames/match` | Записать результат матча (admin, требуется активный сезон) |
| `GET` | `/v1/hungergames/leaderboard` | Текущий лидерборд |
| `GET` | `/v1/hungergames/seasons/{season_id}/leaderboard` | Лидерборд сезона |
| `GET` | `/v1/hungergames/seasons/{season_id}/players/{player_id}` | Статистика игрока в сезоне |

### 2.10 LeaderboardService + StatsService (4 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/leaderboard` | Общий лидерборд |
| `GET` | `/v1/stats` | Статистика сервера |
| `GET` | `/v1/{name}/stats` | Статистика по имени игрока |

### 2.11 ServerInfoService (2 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/serverinfo/totalonline` | Онлайн сервера |
| `GET` | `/v1/serverinfo/worldtime` | Игровое время |

### 2.12 NotificationService (2 эндпоинта)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/v1/notifications` | Список уведомлений (paginated) |
| `POST`| `/v1/notifications/{id}:markAsRead` | Отметить прочитанным |

---

## 3. Ключевые схемы

### 3.1 Settlement

```typescript
interface Settlement {
  id: string;
  name: string;
  type: number;              // enum as integer!
  description: string;
  diplomacy: string;
  leader: Member;
  members: Member[];
  attachments: Attachment[];
  coordinates: Vector2;      // { x: number, y: number }
  created_at: string;        // ISO 8601
  updated_at: string;
  tags: TagReference[];
}
```

### 3.2 SettlementTag

```typescript
interface SettlementTag {
  id: string;
  name: string;
  color: Color;              // { red, green, blue, alpha } float [0,1]
  description?: string;
}
```

### 3.3 User

```typescript
interface User {
  user_id: string;
  user_game_name: string;
  user_name: string;
  previous_nickname?: string;
  is_online: boolean;
  avatar?: {
    original: string;
    x96: string;
    x48: string;
  };
}
```

### 3.4 ShopItem (Market)

```typescript
interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: string;             // decimal as string!
  is_available: boolean;
  created_at: string;
  updated_at: string;
  code: string;              // correlates with in-game asset
}
```

### 3.5 Purchase

```typescript
interface Purchase {
  id: string;
  player_id: string;
  // ... (ref in spec)
}
```

### 3.6 News

```typescript
interface News {
  id: string;
  title: string;
  content: string;
  preview: string;           // base64 or URL
  view_count: string;        // int64 as string!
}
```

### 3.7 Transaction

```typescript
interface Transaction {
  id: string;
  player_id: string;
  amount: string;            // decimal as string
  type: string;
  reason: string;
  purchase_id?: string;
  created_at: string;
}
```

### 3.8 SeasonInfo (HungerGames)

```typescript
interface SeasonInfo {
  id: string;
  number: number;
  started_at: string;
  ended_at?: string;         // absent if active
}
```

### 3.9 MatchResultRequest (HungerGames)

Запрос на запись результата матча. Требуется минимум 2 участника, уникальные `place` и активный сезон.

```typescript
interface MatchResultRequest {
  players: MatchPlayer[];
}

interface MatchPlayer {
  player_id: string;
  player_name: string;
  place: number;             // занятое место, уникальное в рамках матча
  kills: number;             // количество убийств
}
```

**Возможные ошибки:**
- `INVALID_ARGUMENT (400)`: менее 2 игроков, повторяющиеся `place` или отсутствует активный сезон.
- `PERMISSION_DENIED (403)`: недостаточно прав.

### 3.10 SeasonResultEntry

```typescript
interface SeasonResultEntry {
  player_id: string;
  player_name: string;
  elo: number;
  wins: number;
  kills: number;
  // ...
}
```

### 3.11 VerificationStatusResponse

```typescript
interface VerificationStatusResponse {
  status: string;            // e.g. "PENDING", "APPROVED", "REJECTED"
  rejection_reason?: string;
}
```

### 3.12 Notification

```typescript
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  state: number;             // enum as integer
  created_at: string;
}
```

### 3.13 LeaderboardEntry

```typescript
interface LeaderboardEntry {
  name: string;
  deaths: number;
  kills: number;
  hours_played: number;
  user_id: string;
}
```

---

## 4. Маппинг на фронтенд-сервисы

| Сервис бэкенда | Фронтенд-сервис | Путь в проекте |
|----------------|-----------------|----------------|
| SettlementService | `SettlementService` | `src/app/services/settlement.service.ts` |
| DonateService | — | *требуется создание* `DonateService` |
| UserService | `UserService` | `src/app/services/user.service.ts` |
| VerificationService | — | *частично в админке* |
| RuleService | — | *в админке* |
| NewsService | `NewsService` | `src/app/services/news.service.ts` |
| KitService | — | *требуется создание* |
| HungerGamesService | `HungerGamesService` | `src/app/entities/hunger-games/api/hunger-games.service.ts` |
| LeaderboardService / StatsService | `ServerInformationService` | `src/app/services/server-information.service.ts` |
| NotificationService | — | *требуется создание* |
| ServerInfoService | `ServerInformationService` | `src/app/services/server-information.service.ts` |

---

## 5. Рекомендации по интеграции

1. **Создать отдельные API-сервисы** под каждый бэкенд-сервис (или группировать по домену).
2. **Вынести DTO** в `entities/*/model/` (FSD) или `services/interface/` (текущая структура).
3. **Обработка ошибок:** централизованный обработчик для `Status` с маппингом кодов на человекочитаемые сообщения.
4. **Пагинация:** абстрактный сервис/функция для работы с `page_token`.
5. **Кэширование:** `shareReplay(1)` для редко меняющихся данных (список товаров, теги).

---

> **Последнее обновление:** 2026-05-20  
> **Источник:** `v1.openapi.yaml.txt`
