# TODO проекта

> **Что это.** Открытые задачи, которые видит и человек, и агент. Здесь только то,
> что нельзя вывести из кода. Закрытые задачи уходят в летопись `docs/history.md`.

## Архитектура

### Техдолг границ FSD (зафиксирован в `scripts/architecture-baseline.json`)

Проверка `npm run arch` не даёт появиться новым нарушениям, но старые остались:

- `src/app/entities/player-style/api/player-look.service.ts` → `@entities/user/api/user.service`
- `src/app/entities/player-style/api/player-look.service.ts` → `@entities/user/model/i-leader-board`
- `src/app/features/diplomacy/diplomacy-page.component.ts` → `@features/game-chat/model/game-chat-message`
- `src/app/features/home/home.component.ts` → `@app/features/news/ui/news-card/news-card.component`
- `src/app/features/home/home.component.ts` → `@app/features/news/ui/news-skeleton/news-skeleton.component`
- `src/app/features/market/components/how-to-buy/how-to-buy.component.ts` → `@entities/user/api/user.service`
- `src/app/features/market/components/how-to-buy/how-to-buy.component.ts` → `@entities/user/model/i-player`
- `src/app/features/market/market.component.ts` → `@entities/user/api/user.service`
- `src/app/features/player/api/player-profile.service.ts` → `@features/hunger-games/api/hunger-games.service`
- `src/app/features/profile/ui/hunger-games-card/hunger-games-card.component.ts` → `@features/hunger-games/api/hunger-games.service`
- `src/app/features/profile/ui/profile-waiting/profile-waiting.component.ts` → `@features/events/lib/event-status.function`
- `src/app/layout/header/header.component.ts` → `@features/auth/ui/sign-out-confirm/sign-out-confirm.component`
- `src/app/layout/layout.component.ts` → `@features/game-chat/ui/game-chat-widget/game-chat-widget.component`
- `src/app/routes/app.routes.ts` → `../features/news/ui/news-page/news-page.component`
- `src/app/routes/app.routes.ts` → `../features/player/ui/player-page/player-page.component`
- `src/app/routes/app.routes.ts` → `../features/player/ui/profile-style-page/profile-style-page.component`
- `src/app/routes/app.routes.ts` → `../features/videos/ui/videos-page/videos-page.component`
- `src/app/features/home/home.component.ts` → `@app/layout/header/lib/format-server-time.function`
- `src/app/features/landing/landing.component.ts` → `@app/routes/enums/route-keys`
- `src/app/features/profile/profile-navigation/profile-navigation.component.ts` → `@routes/enums/route-keys`
- `src/app/shared/lib/discord-gallery/discord-gallery.service.ts` → `@entities/discord`
- `src/app/shared/lib/discord-webhook/discord-webhook.service.ts` → `@entities/discord`
- `src/app/shared/lib/upload-settlement-attachments.function.ts` → `@entities/media`
- `src/app/shared/ui/ability-tag/ability-tag.component.ts` → `@entities/donate`

Итого по правилам: {"crossSliceRelative":22,"deepImport":17,"upwardImport":7}.

Как чинить: импорт между слайсами — через `index.ts` слайса; слой может импортировать только нижние.

### Контекст для агента

- [ ] Разбить `rules.i18n.ts` (250 kB, 922 ключа) на секции: сейчас любой агент, открывший файл, платит ~85k токенов.
      Обходной путь уже есть: `node scripts/i18n-tool.mjs get|set rules <ключ>`.
- [ ] Подключить ESLint (`npm i -D eslint angular-eslint typescript-eslint` + `--cache ./.npm-cache`, если npm-кэш вне воркспейса закрыт):
      правила `no-restricted-imports` (границы FSD), `no-console`, запрет `any` и hex-цветов в шаблонах.
      Сейчас эти правила живут только в прозе и в `scripts/check-architecture.mjs`.
- [ ] Перевести тесты на Vitest (`npm i -D vitest jsdom`, билдер `@angular/build:unit-test`): сегодня `npm test` требует Chrome, которого нет на агентских машинах, — тесты не запускаются вовсе (их 4 на 749 файлов).

## Продукт

Данные и причины — `docs/research/2026-10-27-conversion-friction.md` (срез Clarity за 25–27.10.2026).

- [ ] Новичку без одобрения показывать вкладку «как играть», а не экран ожидания: `src/app/features/profile/profile.component.html:273`
      (quickback 0.80 на сессию при 50 сессиях за три дня).
- [x] Возвращать пользователя на исходную страницу после входа: сделано, `docs/history.md` §3.-25.
- [ ] Показывать экран «войдите» вместо тихого редиректа на `/` в гардах (`src/app/core/guards/user.guard.ts:29`):
      сейчас неавторизованный уход с `/profile` происходит молча, а при медленном продлении токена — до 15 с ожидания.
- [ ] Вернуть CTA в первый экран на мобильных и снять блокировку прокрутки под сплешем: `src/app/features/home/home.component.html:50`,
      `src/app/layout/layout.component.ts:133` (главная: 49 с на сессию и 46 % глубины скролла).
- [x] Гостю в диалоге покупки — кнопка входа вместо «Купить» с последующим «Требуется авторизация»: сделано,
      `docs/history.md` §3.-24 (`/market`: 109 мёртвых кликов на 138 сессий, самая посещаемая страница).
- [ ] Баг данных: все шесть форм поселений отправляют `type: 'CAMP'`, выбранный уровень до сервера не доходит
      (`src/app/features/profile/create-settlement-from/settlements-types-forms/village-form/village-form.component.ts:158`).
- [ ] Черновик поселения очищать только после успеха ответа: сейчас таймаут 30 с стоит потери текста и 16 изображений
      (`src/app/features/profile/create-settlement-from/settlements-types-forms/village-form/village-form.component.ts:174`).
- [ ] Воронка не измеряется: `METRIKA_ID = 0`, а цели, отправленные до ответа на баннер согласия, теряются
      (`src/app/core/services/analytics.service.ts:145`). Добавить события Clarity на CTA, вход и покупку, получить номер счётчика.
- [ ] Поселения: ошибку загрузки участников показывать с повтором, а не писать в консоль
      (`src/app/features/settlements/settlements.component.ts:230`, quickback 0.95 на сессию).
- [ ] Верификация: ветка ошибки с повтором, когда GET с вопросами упал, и черновик восьми ответов
      (`src/app/features/profile/player-verification-form/player-verification-form.component.html:3`).

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
