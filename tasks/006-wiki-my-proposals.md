# 006 — Wiki: «Мои предложения» в профиле

Цель: игрок видит свои предложения в вики — что на проверке, что одобрено, что отклонено и почему. Сейчас отправленное предложение исчезает: экрана для автора нет, а причину отказа сервер хранит, но показать её негде. Данные уже есть: для игрока `GET /v1/wiki/suggestions` отдаёт только его собственные.

Ветка: agent/006 от agent/004 (нужен `WikiSuggestion` с полями из 004 и постраничная загрузка из 003).
Связано: vsservice tasks/004 шлёт уведомление о решении; эта страница — куда игрок идёт после него. Друг от друга задачи не зависят.

Правила проекта: AGENTS.md, docs/ARCHITECTURE.md («как добавить страницу»). JSDoc на русском. Тексты — `npm run i18n -- set …`, в конце `npm run i18n -- check`. Серверный текст (причина отказа, пояснение автора) — только интерполяцией `{{ }}`.

Пути ниже — от `src/app/`.

## A. Маршрут и навигация
1. `routes/app.routes.ts`: дочерний маршрут профиля `wiki` рядом с `referral` (тот же способ: `loadPage` + словарь `WIKI_I18N`), компонент `MySuggestionsComponent` из `@features/wiki`.
2. `routes/enums/route-keys.ts`: новый ключ (следующий свободный номер).
3. `features/profile/profile-navigation/`: пункт «Вики» с иконкой `@tui.book-open`, по образцу пункта `referral` (те же `title` / `aria-label`); ключ `profile.nav.wiki`. Показывать всем, у кого есть профиль.

## B. Страница
`features/wiki/ui/my-suggestions/my-suggestions.component.{ts,html,less}`, экспорт из `features/wiki/index.ts`.
1. Данные — `WikiStoreService.suggestions()` (постраничная загрузка из задачи 003). Состояния — загрузка (скелетоны), ошибка (`shared/ui/error-state` с кнопкой «Повторить»), пусто, список.
2. Шапка:
   - заголовок `wiki.mine.title`;
   - счётчик `wiki.mine.pending` — `{{count}} из 5 на проверке` (лимит 5 — константа с комментарием «совпадает с MaxPendingSuggestions в vsservice»);
   - кнопка «Предложить статью» → `/wiki/edit/new` (`routerLink`); неактивна с подсказкой `wiki.mine.limitReached`, если на проверке уже 5.
3. Фильтр по статусу — чипы «Все / На проверке / Одобрены / Отклонены» (тот же идиом, что в очереди редактора `wiki-suggestions`).
4. Карточка предложения, новые сверху:
   - заголовок из `proposal.title`;
   - вид: `wiki.mine.kindNew` или `wiki.mine.kindEdit` с названием статьи;
   - статус-бейдж (цвета — как у статусов в очереди редактора);
   - дата отправки и дата решения (`shared/ui/relative-time`, если подходит);
   - пояснение автора (`note`), если есть;
   - для отклонённого — блок «Причина» с `rejectReason`;
   - для одобренного — ссылка «Открыть статью» на `/wiki/<slug>`: slug берётся из `store.get(appliedArticleId)?.slug ?? proposal.slug`;
   - для ожидающего правки — ссылка на текущую статью.
5. Предпросмотр текста не нужен — это не очередь модерации.

## C. После отправки
`wiki-editor-page`: в подтверждении «Предложение отправлено» (сигнал `suggestSent`) добавить ссылку `wiki.mine.open` → `/profile/wiki`.

## D. i18n (ru / en)
- `profile.nav.wiki` (словарь профиля): `Вики` / `Wiki`
- `wiki.mine.title`: `Мои предложения` / `My proposals`
- `wiki.mine.pending`: `{{count}} из 5 на проверке` / `{{count}} of 5 waiting for review`
- `wiki.mine.new`: `Предложить статью` / `Propose an article`
- `wiki.mine.limitReached`: `Дождитесь решения по отправленным — на проверке может быть не больше 5` / `Wait for a decision — at most 5 proposals can wait for review`
- `wiki.mine.kindNew`: `Новая статья` / `New article`
- `wiki.mine.kindEdit`: `Правка статьи «{{title}}»` / `Edit to “{{title}}”`
- `wiki.mine.reason`: `Причина` / `Reason`
- `wiki.mine.openArticle`: `Открыть статью` / `Open the article`
- `wiki.mine.empty`: `Вы ещё ничего не предлагали. Нашли ошибку в статье или знаете, о чём написать? Предложите — редакторы проверят.` / `You haven’t proposed anything yet. Found a mistake or know what to write about? Propose it — editors will review.`
- `wiki.mine.open`: `Мои предложения` / `My proposals`
Статусы — переиспользовать существующие ключи очереди редактора (проверить в `wiki.i18n.ts`), новые не заводить.

## Проверка исполнителем
- `npm run verify`, `npx ng build` — 0 ошибок; `npm run map`, если добавлены файлы в `src/` (карта навигации генерируется).
- Руками под игроком: пункт в навигации профиля; пустое состояние; отправить предложение из редактора → ссылка в подтверждении ведёт сюда, предложение в списке «На проверке»; под редактором отклонить с причиной → у игрока статус и причина; одобрить другое → ссылка на статью открывает её.
- Тёмная тема и ширина 360 px.

## Не делать
- отзыв предложения игроком — на бэкенде нет такого метода;
- не менять очередь модерации редактора.

## Отчёт
≤10 строк: что сделано, что нет, результаты ручной проверки. `git commit` + `git push -u origin agent/006`.
