# Ранние записи летописи (3.0—3.-4)

> Перенесено из `docs/history.md` без правок: летопись упёрлась в бюджет 120 kB.
> Живые решения и причины — по-прежнему в `docs/history.md`, здесь только старые записи.

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
- `src/app/layout/background-scene/` — фон сайта: старинная карта-портолан на inline-SVG (горизонтали рельефа, роза ветров с лучами румбов и градусной шкалой, градусная сетка, пунктир маршрута к кресту-кладу). Чернила пергаментного тона с прозрачностью в несколько процентов, центр под контентом приглушён маской. Движение почти незаметное: горизонтали один раз прорисовываются пером при загрузке, дальше медленный дрейф, вращение шкалы розы и ползущий пунктир маршрута. Формы строятся из синусоид с фазами по номеру линии — одинаково на SSR и в браузере; `prefers-reduced-motion` выключает анимации. Лежит под виньеткой, пульсом очага и искрами (`background-particles`).
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

### 3.6.4 Оглавление правил и компоновка страниц

- Правила (`/rules`): оглавление `features/rules/ui/rules-toc/` (список разделов
  `features/rules/config/rules-toc-sections.constant.ts`, модель
  `features/rules/model/rules-toc-item.interface.ts`). От 1024px — липкая колонка
  слева, на узком экране — строка чипов. Клик раскрывает раздел и прокручивает к
  блоку `#rules-<sectionId>` (`RulesComponent.goToSection`). Новый раздел правил
  добавлять и в шаблон, и в константу оглавления.
- «Начать игру»: карточки «Сервер» и «Если что-то не так» — ряд над путём
  новичка, путь на всю ширину (раньше справка была узкой колонкой с пустотой под ней).
- Статистика: «История покупок» и «Голодные игры» в одной сетке (3fr / 2fr).
- Шапка профиля: баннер на всю карточку, читаемость — подложка `.profile-cover::after`;
  действия с профилем в строке с ником, плашка поселения горизонтальная во всю ширину.
- Главное меню на десктопе снова с иконками.
- `/start-game` только для гостей: `core/guards/guest.guard.ts` отправляет вошедшего
  в `/profile/how-play`. Пункт меню «Начать игру» помечен `lh-guest-only`, чтобы не
  мелькать у вошедшего до проверки входа; флаг `lh-has-session` снимает шапка
  (раньше — только главная, и на других страницах гость с протухшей сессией терял пункт).
- Профиль: карточка «Ваш путь на сервер» убрана — для вошедшего она повторяла вкладку
  «Как начать играть». Прогресс (правила, поселение, Discord; «Готово N из 3») теперь
  в третьем шаге `features/profile/how-play`. Анкета и вход у вошедшего игрока всегда
  пройдены, поэтому не показываются. `app-newcomer-path` остался только на «Начать игру»:
  вариант для профиля, входы `details`/`settlementName`, кнопка «Скрыть» и
  `OnboardingService.hidden/hide()` удалены.
- Шапка профиля сворачивается на всех вкладках, кроме «Как начать играть»
  (`ProfileComponent.compactHeader`): остаются аватар, ник и действия, а поселение,
  значки, показатели и «Мои события» — по кнопке «Показать всё». При смене вкладки
  шапка снова сворачивается.
- nginx: «/» отдаёт 301 на /home сервером, запасная страница — `index.csr.html`
  (оболочка Angular). Сборка всегда кладёт пустой `index.html` (место предрендера
  редиректа «/»); раньше nginx отдавал его на «/» и на все непредрендеренные адреса
  (/profile, /player/…) — белый экран. «/» убран из `routes.txt`.
- Числа на сайте — пайп `amount` (`core/i18n/amount.pipe.ts`): разряды по языку сайта.
- Чип игрока (`entities/user/ui/player-chip`): радиус 0.75rem под форму аватара.

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

### 3.9 Карточка списка вики: лист хроники

> Заменено редакцией 2 (§3.10). Урок: прежняя карточка не отличалась от типовой
> блог-сетки, а маркеры и кикер-пилюли — типовые AI-тики (§6.3.4).

### 3.10 Карточка вики, редакция 2: читальня у очага

- Заменяет анатомию §3.9: оправа с паспарту, сургучная печать, бирка раздела на
  раме и чернильная линейка убраны — карточка стала тише, подпись несёт один свет.
- Концепт: список вики — читальня у очага (имя сервера Last Hearth даёт метафору).
  Сигнатура: тёплое пятно света следует за курсором (`__glow`, только `transform`
  и `opacity`, отставание на `--lh-ease-smooth`); на таче и при уменьшенном
  движении свет выключен (`pointerType !== 'mouse'`, `prefers-reduced-motion`).
- Композиция: первый лист порядка — разворот (`--lead`, `grid-column: 1 / -1`):
  пластина 52% слева, текст справа, заголовок 2.25rem, теги статьи под вступлением
  (`WikiCard.tags`, не более трёх); на <40rem разворот складывается в колонку.
- Рядовой лист: пластина в край карточки с двойным затемнением (верхнее — под
  капитель `__hud`, нижнее — под заголовок); заголовок стоит на пластине цветом
  `--lh-parchment-3`. Без обложки пластина — ночной градиент, заголовок читаем всегда.
- Черновик переехал из пластины в колофон: на узкой пластине он теснил бирку
  раздела и минуты (`__hud` получил `flex-wrap`, минуты — `nowrap`).
- Узкие экраны: дорожка `minmax(min(17rem, 100%), 1fr)`, `min-width: 0` у карточки;
  замер в headless: `scrollWidth == innerWidth`, горизонтального переполнения нет.
- Радиусы управлений страницы приведены к одной семье: поле поиска и бирка
  черновика — пилюли, как чипы и CTA; поверхности остаются `--lh-panel-radius`.
  Правка по замечанию с телефона: рядом стояли пилюля, прямоугольник 0.7rem и 1.5rem.
- Концентричность углов пластины задана явно, а не обрезкой карточки: радиус
  пластины равен `--lh-panel-radius` на углах, выходящих к краю карточки (верх у
  рядового листа и сложенного разворота, лев у разворота), остальные углы — прямой
  стык. Формула из DESIGN_SYSTEM §6.3.2 при нулевом зазоре: r внутренний = r панели.
- Угол карточки острее панелей страницы: `--lh-panel-radius: 0.75rem` переопределён
  на `.wiki-card` (правка по продакшен-кадру: 1.5rem читался слишком круглым).
  Пластина наследует ту же переменную, концентричность не ломается.
- Файлы: те же, что в §3.9, плюс `WikiCard.tags` и `LEAD_TAG_LIMIT` в компоненте.

---

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
- Конфиг (`entities/settlement/config/`):
    - `default-settlement-cover.constant.ts` — `DEFAULT_SETTLEMENT_COVER = '/landing-carousel/1.webp'`.
- UI-потребители переведены с `.leader` на owner-модель: `settlements.component`, `settlement-card`, `settlement-detailed`, `features/settlements/settlement`, `features/profile`.
    - Кнопки гейтятся: инвайты по `canInvite` (`PERMISSION_INVITE_MEMBER`/owner), уровень/редактирование/картинка — по `isOwner`, выход — не-owner.
    - Бейджи ролей члена — `getMemberRoleNames`, скрыты при `roles_enabled=false`.
    - `contact_info` и `role.name` выводятся ТОЛЬКО интерполяцией `{{ }}` (XSS: сервер не экранирует).
    - Счётчики жителей: `members.length` (owner теперь внутри `members`, не `+1`).

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
