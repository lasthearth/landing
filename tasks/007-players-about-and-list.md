# 007 — Игроки: описание «О себе» в профиле и страница `/players`

Цель — две вещи. Макеты: артефакт «Игроки и описание профиля — Last Hearth» (четыре экрана: профиль с блоком «О себе», редактирование, список на десктопе и на телефоне). Бэкенд: vsservice tasks/005.
1. **«О себе».** На `/player/<ник>` под шапкой — блок с текстом, который игрок пишет сам. Владелец правит его прямо на своей странице; администратор может скрыть.
2. **Страница «Игроки».** `/players`: поиск по нику, фильтр «был в игре» со счётчиками, сортировка, нумерованные страницы. Карточка игрока ведёт в его профиль.

Ветка: agent/007 от main.
Зависимость: vsservice tasks/005 (`UpdateMyAbout`, `HideAbout`, `ListPlayers`, поле `about` у `User`). Код можно писать раньше, а проверять руками — когда бэкенд на dev-стенде.

Правила проекта: AGENTS.md, docs/ARCHITECTURE.md (как добавить страницу), docs/DESIGN_SYSTEM.md, docs/API.md, **docs/TRAPS.md** (в нём две ловушки, на которых споткнулись прошлые задачи — обе касаются этой). JSDoc на русском у каждого публичного элемента. Цвета — только токены `--lh-*`. Серверный текст (описание, ники) — только интерполяцией `{{ }}`.

**Переводы.** `npm run i18n -- set` меняет только существующие ключи и на новых падает с «ключ не найден». Все новые ключи этой задачи дописать в словари руками (ru и en), потом `npm run i18n -- check`. И отдельно проверить, что ни один ключ из шаблонов не отсутствует в словаре (в прошлый раз 29 ключей не дошли до словаря, и проверка паритета этого не увидела).

Пути — от `src/app/`.

## A. API
1. `entities/user/model/i-player.ts`: `about?: string; about_updated_at?: string;`.
2. `entities/user/api/` — новый `players.api.ts` (`PlayersApiService`, `providedIn: 'root'`), экспорт через `index.ts` слайса:
   - `updateMyAbout$(about: string): Observable<IPlayer>` — `PUT /users/me/about`, тело `{ about }`;
   - `hideAbout$(userId: string, reason: string): Observable<void>` — `POST /users/{id}/about:hide`, тело `{ reason }`;
   - `list$(params: PlayersQuery): Observable<PlayersPage>` — `GET /players`; `params`: `query`, `lastSeen` (`'all' | 'online' | 'day' | 'week' | 'month' | 'inactive'`), `sort` (`'seen' | 'hours' | 'name'`), `page`, `pageSize`. Перевод в enum API: `LAST_SEEN_*`, `PLAYER_SORT_*`; `all` и `seen` не отправлять (дефолт сервера).
   - Модель ответа — `entities/user/model/players-page.ts`: `PlayersPage { players: PlayerListItem[]; total: number; page: number; pageSize: number; counts: Record<LastSeenFilter, number> }`, `PlayerListItem { userId, nickname, avatarUrl, isOnline, lastOnline: string | null, hours: number, about: string }`. Аватар — та же цепочка, что в `PlayerProfileService.player()` (`original || x96 || x48 || '/default-avatar.webp'`). `hours_played` и счётчики из gateway могут прийти строкой — `Number(...)`.
   - На `list$` — `SKIP_ERROR_ALERT`: у страницы своё состояние ошибки (docs/API.md).

## B. «О себе» на странице игрока
3. `features/player/model/player-profile.ts`: `about: string`, `aboutUpdatedAt: string | null`. `PlayerProfileService.player()` уже берёт игрока из `getPlayersBatch$` — забрать оттуда же `about` и `about_updated_at`.
4. Новый компонент `features/player/ui/player-about/` (`app-player-about`), входы `profile`, `isOwner`, `canModerate`; выход `changed` (новый текст — страница обновляет профиль без перезагрузки). Место — в `player-page.component.html` между шапкой (`player-hero`) и статистикой (`player-stats`). Вид — по макетам `Main` и `AboutEdit`:
   - **чужой профиль, текст есть:** панель `.lh-panel`, заголовок «О себе» (`lh-display`, иконка `@tui.feather`), справа мелко «Обновлено {{время}}» (`appRelativeTime`), текст — `white-space: pre-line`, шрифт как у текста статей вики, ширина строки до `68ch`;
   - **чужой профиль, текста нет:** блок не выводится вообще;
   - **свой профиль, текста нет:** панель с пунктирной рамкой, пояснение и кнопка «Написать о себе» (`lh-cta`);
   - **свой профиль, текст есть:** как у чужого + кнопка «Изменить» (`@tui.pencil`) справа от заголовка;
   - **редактирование:** `<label>` «О себе» + `<textarea>` (7 строк, растягивается по вертикали), под ним подсказка с правилами и счётчик `N / 500` (`aria-live="polite"`; от 451 — `--lh-warning-ink`, больше 500 — `--lh-danger-ink`). Если больше 500 символов или 8 строк — сообщение об ошибке, «Сохранить» неактивна. Кнопки: «Удалить описание» (слева, только если текст был), «Отмена», «Сохранить». `Ctrl+Enter` — сохранить, `Esc` — отмена. Символы считать через `Array.from(text).length` (как сервер — в рунах).
   - **после сохранения:** вид «текст есть» и на 3 секунды «Сохранено» (`role="status"`). Ошибка сервера — сообщение под полем, текст в поле сохраняется: `grpcStatusCode` (`shared/lib`) = 3 → `player.about.errors.invalid`, 9 → `player.about.errors.notVerified`, остальное — `player.about.errors.failed`.
   - **модератор** (`canModerate` — роль `Role.admin` у текущего пользователя), чужой профиль с текстом: ссылка-кнопка «Скрыть описание» внизу панели → окно с обязательной причиной (образец — окно отклонения в `features/wiki/ui/wiki-suggestions/`) → `hideAbout$` → блок исчезает.
   - `isOwner` — `userService.userId === profile.userId`.
5. `prefers-reduced-motion` — без анимации появления.

## C. Страница «Игроки»
6. Роут `players` в `routes/app.routes.ts` рядом с `player/:nick`: `loadPage` с компонентом `PlayersPageComponent` из `@features/players` и словарём `PLAYERS_I18N`; `RouteKeys.players = 26`; `seo: routeSeoData.players` (title «Игроки — Last Hearth», description «Все игроки сервера Last Hearth: поиск по нику, кто был в игре недавно, поселения и описания.»).
   - `/players` — в `routes.txt` (пререндер) и в таблицу `STATIC_PAGES` в `scripts/gen-sitemap.mjs` (`daily`, `0.6`).
   - `isProfilePage()` в `landing.component.ts` **не трогать**: это не вкладка профиля.
7. Шапка: `layout/header/config/header-community-links.constant.ts` — пункт `{ route: '/players', icon: '@tui.users-round', labelKey: 'header.nav.players' }` первым в списке «Сообщество».
8. Новый слайс `features/players/` (`index.ts`, `ui/players-page/`, `ui/player-card/`, `i18n` — `core/i18n/translations/features/players.i18n.ts`). Вид — по макетам `Players` (десктоп) и `PlayersPhone`:
   - шапка страницы — `shared/ui/page-header` («Игроки» + подзаголовок);
   - панель фильтров: поле поиска (`type="search"`, `<label>` для скринридера, иконка `@tui.search`), выбор сортировки («недавно в игре / больше часов / по нику»), ряд кнопок-чипов «Был в игре: Все · Сейчас в игре · За сутки · За неделю · За месяц · Больше месяца назад», у каждого — число из `counts`, активный — брендовый фон и `aria-pressed="true"`, у «Сейчас в игре» зелёная точка; на телефоне чипы — горизонтальная прокрутка;
   - строка «Игроков: N · страница X из Y» и «Сбросить фильтры» (только если что-то выбрано);
   - сетка карточек `repeat(auto-fill, minmax(320px, 1fr))`, на телефоне — одна колонка;
   - **карточка** (`app-player-card`, вход `PlayerListItem` + поселение + оформление) — целиком ссылка `routerLink="/player/<ник>"`: аватар в рамке из `PlayerLookService.lookOf(userId)` (`app-player-frame`), зелёная точка «в игре», ник (`lh-display`), статус («Сейчас в игре» зелёным, иначе «Был в игре {{время}}» через `appRelativeTime`, без даты — «Не в игре»), описание в 2 строки (`line-clamp`), без описания — курсивом приглушённо «Пока ничего о себе не рассказал»; внизу через линию — поселение («Глава/Житель «Название»» или «Без поселения») и часы. Ховер — подъём на 2px (токены движения, без `transition: all`), фокус — общее кольцо.
   - поселения: один раз `SettlementService.getSettlements()` → карта `userId → { settlement, role }` (роль через `isOwner`, как в `PlayerProfileService.settlementOf`); вынести общую функцию в `entities/settlement/lib`, если её нет, и использовать в обоих местах;
   - **пагинация** — новый общий компонент `shared/ui/pagination/` (`app-pagination`, входы `page`, `total`, `pageSize`, выход `pageChange`): стрелки (44×44, `aria-label`), номера с многоточиями («1 … 4 5 6 … 12»), текущий — `aria-current="page"`; уже 480px — только стрелки и «X из Y». После смены страницы — прокрутка к началу списка;
   - состояния: загрузка — скелетоны карточек (`shared/ui/skeletons`), ошибка — `shared/ui/error-state` с «Повторить», пусто — `shared/ui/empty-state` «Никого не нашли» + «Сбросить фильтры».
9. Поведение:
   - всё состояние — в адресе: `?q=&seen=&sort=&page=` (по умолчанию параметры не пишутся); «Назад» в браузере возвращает предыдущий набор; ссылкой на подборку можно поделиться;
   - поиск — после паузы 300 мс и только с 2 символов; новый ввод отменяет предыдущий запрос (`switchMap`); смена поиска, фильтра или сортировки — на первую страницу;
   - размер страницы — 24;
   - загрузка только в браузере; при пререндере — скелетоны.
10. SEO: страница списка — `routeSeoData.players`; на странице игрока ничего не менять.

## D. i18n (ru / en) — дописать руками
`player.about`: `title` «О себе» / «About»; `updated` «Обновлено» / «Updated»; `emptyOwn` «Расскажите, чем вы занимаетесь в игре, когда обычно играете и как с вами связаться. Так проще найти компанию и союзников.» / «Tell others what you do in the game, when you usually play and how to reach you. It makes finding company and allies easier.»; `write` «Написать о себе» / «Write about yourself»; `edit` «Изменить» / «Edit»; `placeholder` «Чем вы занимаетесь в игре, когда играете, как с вами связаться» / «What you do in the game, when you play, how to reach you»; `hint` «Обычный текст, до 500 символов и 8 строк. Без оскорблений, рекламы других серверов и чужих личных данных — модераторы могут скрыть описание.» / «Plain text, up to 500 characters and 8 lines. No insults, ads for other servers or other people’s personal data — moderators may hide the description.»; `counter` «{{count}} / 500»; `tooLong` «Слишком длинно: уберите {{count}} симв.» / «Too long: remove {{count}} characters»; `tooManyLines` «Не больше 8 строк» / «At most 8 lines»; `save` «Сохранить» / «Save»; `cancel` «Отмена» / «Cancel»; `remove` «Удалить описание» / «Delete description»; `saved` «Сохранено» / «Saved»; `hide` «Скрыть описание» / «Hide description»; `hideTitle` «Скрыть описание игрока?» / «Hide this player’s description?»; `hideReason` «Причина — её увидит игрок» / «Reason — the player will see it»; `errors.invalid` «Сервер не принял текст: проверьте длину и уберите служебные символы.» / «The server rejected the text: check the length and remove special characters.»; `errors.notVerified` «Описание можно добавить после проверки анкеты.» / «You can add a description once your application is approved.»; `errors.failed` «Не удалось сохранить. Попробуйте ещё раз.» / «Could not save. Try again.».

`players` (новый словарь `PLAYERS_I18N`): `title` «Игроки» / «Players»; `subtitle` «Все, кто играет на Last Hearth. Ищите по нику и смотрите, кто был в игре недавно.» / «Everyone who plays on Last Hearth. Search by nickname and see who was in the game recently.»; `search` «Найти по нику» / «Find by nickname»; `searchLabel` «Поиск по нику» / «Search by nickname»; `sort.label` «Сначала» / «Sort by»; `sort.seen` «недавно в игре» / «recently in game»; `sort.hours` «больше часов» / «most hours»; `sort.name` «по нику» / «nickname»; `seen.label` «Был в игре:» / «In game:»; `seen.all` «Все» / «All»; `seen.online` «Сейчас в игре» / «Now»; `seen.day` «За сутки» / «Last 24 hours»; `seen.week` «За неделю» / «Last week»; `seen.month` «За месяц» / «Last month»; `seen.inactive` «Больше месяца назад» / «Over a month ago»; `found` «Игроков: {{count}}» / «Players: {{count}}»; `pageOf` «страница {{page}} из {{pages}}» / «page {{page}} of {{pages}}»; `reset` «Сбросить фильтры» / «Reset filters»; `empty` «Никого не нашли» / «No one found»; `emptyHint` «Проверьте ник или выберите другой период.» / «Check the nickname or pick another period.»; `noAbout` «Пока ничего о себе не рассказал» / «Hasn’t written anything yet»; `noSettlement` «Без поселения» / «No settlement»; `hours` «{{count}} ч в игре» / «{{count}} h in game»; `loadError` «Не удалось загрузить игроков» / «Could not load players».

`header.nav.players`: «Игроки» / «Players». `shared` — для пагинации: `pagination.prev` «Предыдущая страница» / «Previous page», `pagination.next` «Следующая страница» / «Next page», `pagination.label` «Страницы» / «Pages», `pagination.of` «{{page}} из {{pages}}» / «{{page}} of {{pages}}».

## Тесты (karma, рядом с файлами)
- функция страниц пагинации (номера с многоточиями для 1, 2, 7, 12 страниц и разных текущих);
- перевод параметров `PlayersQuery` ↔ query-параметры адреса и ↔ параметры API (значения по умолчанию не пишутся);
- подсчёт длины описания в рунах и строк (кириллица, эмодзи).

## Проверка исполнителем
- `npm run verify`, `npm test`, `npx ng build` — 0 ошибок; `npm run map` (новые файлы в `src/`).
- Все ключи из шаблонов этой задачи есть в словарях (см. «Переводы» выше).
- Руками на dev-стенде:
  1. свой профиль без описания → «Написать о себе» → 501 символ блокирует сохранение → сохранить 3 строки → перезагрузить страницу, текст на месте с переносами;
  2. чужой профиль без описания — блока нет; с описанием — есть;
  3. под администратором — «Скрыть описание» с причиной, у игрока пришло уведомление;
  4. `/players`: поиск «ве», фильтр «За неделю», сортировка «больше часов», страница 2 → адрес содержит всё, «Назад» возвращает прошлое состояние, перезагрузка восстанавливает;
  5. ширина 360 px и тёмная тема на обеих страницах.

## Не делать
- жалобы на описания и разметку (жирный, ссылки) в описании;
- не менять таблицу лидеров, статистику профиля и `SearchUsers`;
- не добавлять `/players` во вкладки профиля.

## Отчёт
≤10 строк: что сделано, что нет, результаты ручных проверок 1–5. `git commit` + `git push -u origin agent/007`.
