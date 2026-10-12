# API и ошибки

> **Что это.** Правила работы с бэкендом. Полный контракт — `API_CONTRACT.md` (эндпоинты, схемы, коды),
> живая спека — `https://docs.lasthearth.ru/v1/openapi.yaml`, снимок — `docs/archive/openapi-snapshot.yaml`.

## Что читать первым

- `API_CONTRACT.md` §4 «Примечания для агентов» — семь правил, которые чаще всего нарушают.
- `API_CONTRACT.md` §3.3–3.4 — что не реализовано и где дублируются сервисы.

## Правила

1. Базовый URL — только из `src/app/core/config/environments/environment.ts` (`environment.apiUrl`). Хардкод `https://api.lasthearth.ru/v1` запрещён.
2. DTO-интерфейсы — рядом с API-сервисом (`entities/<домен>/model/`), мапперы — там же. UI-модели не смешивать с DTO.
3. `Bearer` вручную не добавлять: это делает `authInterceptor`. Исключение — файлы, ещё не переведённые на интерцептор.
4. Пагинация — `page_token` / `next_page_token` (News, Notifications, Donate pending purchases), не offset/limit.
5. Decimal-поля (`coins`, `price`, `reward_coins`) — **строки** и в DTO, и в UI-моделях. В `number` не приводить.
6. Новый API-сервис: `entities/<домен>/api/<домен>.service.ts` + `model/<домен>.types.ts` + `model/<домен>.mapper.ts` + `index.ts`.
7. Загрузка файлов — только через `MediaService` (`/v1/media/upload-urls` → `multipart/form-data POST` на `post_url` →
   `public_url` идёт в `image_url` / `preview` / `attachments[].url`). На `post_url` `Authorization` **не отправлять**.

## Ошибки — главная ловушка

- `errorInterceptor` для GET **сам показывает алерт и возвращает `EMPTY`**. `catchError` в компоненте этого уже не увидит.
- Если запрос доступен не всем и его 401/403 не должен кричать пользователю:
  `new HttpContext().set(SKIP_ERROR_ALERT, true)` **и** гейт по праву до подписки — нужны оба слоя.
- Пользователю показывать ошибки через `NotificationService` (`TuiAlertService`).
- Модель ошибки бэкенда — `google.rpc.Status`: 400 INVALID_ARGUMENT, 401, 403 PERMISSION_DENIED, 404, 409, 412 FAILED_PRECONDITION, 500.
- Отмена и перезапрос запросов: `switchMap` + `takeUntilDestroyed`.
