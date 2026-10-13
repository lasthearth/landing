# 004 — Wiki: понятные ошибки сохранения, устаревшие правки игроков, загрузка картинок игроком

Цель — три проблемы.
1. **Любая ошибка сохранения выглядит как «Не удалось сохранить».** Сервер различает: статью изменил другой редактор (FAILED_PRECONDITION), адрес занят (ALREADY_EXISTS), у игрока уже 5 предложений на проверке (RESOURCE_EXHAUSTED). Человек не знает, что делать дальше, а при конфликте версий может решить, что текст потерян.
2. **Одобрение правки игрока может затереть правку редактора.** Бэкенд (vsservice tasks/002) теперь хранит у правки `base_version` и `base` — статью, какой её видел игрок — и без `allow_stale` отказывает в одобрении устаревшей правки кодом ABORTED. Фронт должен отправлять версию, показывать модератору, что игрок изменил *от своей базы*, и предупреждать, если статья с тех пор менялась.
3. **Игрок не может прикрепить картинку к предложению.** Редактор грузит с `UPLOAD_PURPOSE_NEWS`, а это назначение требует права `news:create`. Бэкенд (vsservice tasks/003) добавил `UPLOAD_PURPOSE_WIKI` без требования прав.

Ветка: agent/004 от agent/003.
Зависимости: vsservice tasks/002 и tasks/003 должны быть на dev-стенде для ручной проверки. Код можно писать раньше: поля новые и необязательные, старый сервер их просто не пришлёт.

Правила проекта: AGENTS.md, docs/API.md. JSDoc на русском. Тексты — `npm run i18n -- set …`, в конце `npm run i18n -- check`.

Пути ниже — от `src/app/`.

## A. Код ошибки сервера
HTTP-статус ошибки неоднозначен (FAILED_PRECONDITION и INVALID_ARGUMENT оба приходят как 400), поэтому смотрим на числовой gRPC-код в теле — `google.rpc.Status.code`.
1. `shared/lib/grpc-status-code.function.ts`:
   ```ts
   /**
    * Числовой gRPC-код из тела ошибки бэкенда (`google.rpc.Status.code`).
    *
    * @param error Ошибка из HttpClient.
    * @returns Код или `null`, если это не ответ бэкенда.
    */
   export function grpcStatusCode(error: unknown): number | null
   ```
   Плюс `export const GrpcCode = { invalidArgument: 3, alreadyExists: 6, resourceExhausted: 8, failedPrecondition: 9, aborted: 10 } as const;` в том же слайсе, отдельным файлом (один файл — одна сущность). Экспорт через `index.ts` слайса, если он у `shared/lib` есть, иначе — как импортируются соседние функции `shared/lib`.
2. Юнит-тест на `grpcStatusCode` (karma, рядом с файлом): `HttpErrorResponse` с телом `{ code: 9 }` → 9; без тела → `null`; не `HttpErrorResponse` → `null`.

## B. Редактор: сохранение статьи редактором
`features/wiki/ui/wiki-editor-page/wiki-editor-page.component.ts`, метод `save()`, ветка `catch`:
1. `failedPrecondition` (статью изменили) → открыть окно конфликта:
   - перед окном — `store.refresh(id)` (метод из задачи 003), чтобы получить свежую версию;
   - в окне — заголовок, текст, построчное сравнение «свежая версия на сервере → ваш текст» (`lineDiff(fresh.body, this.body())`), разметка — как в окне истории правок (`.we__diff`, `.we__dialog--wide`);
   - кнопки:
     - «Оставить мою версию» — сохранить ещё раз; ожидаемая версия теперь свежая, поэтому сервер примет;
     - «Взять версию с сервера» — `applyDraft(fresh)`, обновить `savedSnapshot`; набранный текст остаётся в автосохранении браузера, это сказать в тексте окна;
     - «Закрыть» — ничего не менять.
   - закрытие по Esc — как у остальных окон редактора (см. обработку `historyOpen` в `onDocumentKeydown`).
2. `alreadyExists` → под полем адреса показать `wiki.lint.slugTaken` (ключ уже есть, параметр `slug`), переключиться на вкладку «Свойства», сфокусировать поле адреса (`id` поля — как у переходов из вкладки «Проверка»).
3. Остальное — как сейчас: `saveError`.

## C. Редактор: отправка предложения игроком
1. `WikiStoreService.submitSuggestion(proposal, articleId, note)` → добавить четвёртый параметр `baseVersion: number`; `WikiApiService.submitSuggestion` кладёт его в тело как `suggestion.base_version` (рядом с `article_id`). Для новой статьи — 0.
2. В редакторе передавать `this.store.versionOf(this.articleId())`.
3. Ошибки `submitForReview()`:
   - `resourceExhausted` → `wiki.editor.suggestLimit`;
   - `failedPrecondition` → `wiki.editor.suggestOutdated`;
   - остальное — как сейчас.
   Сообщение — там же, где `saveError` в шапке редактора; отдельный сигнал `suggestError = signal<string | null>(null)` с ключом перевода.

## D. Очередь предложений: что изменил игрок и что изменилось с тех пор
`entities/wiki`:
1. `WikiSuggestionDto` (`model/wiki.types.ts`): `base_version?: string | number`, `base?: WikiArticleDto | null` (int64 из gateway может прийти строкой — привести через `Number`, как уже делается для `version`).
2. `WikiSuggestion` (`api/wiki.api.ts`): `readonly baseVersion: number; readonly base: WikiArticle | null;` + маппер.
3. `approveSuggestion(id, allowStale = false)` — тело `{ allow_stale: allowStale }`. В хранилище — тот же параметр.

`features/wiki/ui/wiki-suggestions/wiki-suggestions.component.ts/.html`:
4. Базовая статья для сравнения: `item.base ?? target(item)` (у старых предложений `base` нет — сравниваем с текущей, как сейчас). `fieldChanges` и `diff` строятся от неё. Сейчас они строятся от текущей статьи — из-за этого правки редактора, сделанные после предложения, выглядят как удаления игрока.
5. `isStale(item)`: правка (`kind === 'article_edit'`), текущая статья загружена, и `item.baseVersion === 0 || target.version !== item.baseVersion`.
6. Если `isStale` — над сравнением предупреждение (текст — `--lh-warning-ink`, фон — `color-mix` от него с прозрачностью, как у других плашек):
   - текст `wiki.review.stale` с параметрами `{ from: item.baseVersion, to: target.version }`; для старого предложения без версии — `wiki.review.staleUnknown`;
   - кнопка-переключатель «Показать, что изменилось с тех пор» → второе сравнение `lineDiff(base.body, target.body)` (только если `base` есть).
7. Одобрение:
   - если `isStale` — сначала окно подтверждения (`ConfirmDialogService`, как удаление в админке) с текстом `wiki.review.staleConfirm`; при согласии — `approveSuggestion(id, true)`;
   - ответ `aborted` (кто-то сохранил статью между загрузкой очереди и нажатием) → `store.refresh(articleId)`, перезагрузить очередь, сообщение `wiki.review.staleNow`; предложение остаётся открытым, предупреждение появится само;
   - ответ `failedPrecondition` (предложение уже рассмотрел другой) → сообщение `wiki.review.alreadyReviewed` и перезагрузка очереди.

## E. Загрузка картинок
1. `entities/media/model/media.types.ts`: в объединение назначений добавить `'UPLOAD_PURPOSE_WIKI'`.
2. `wiki-editor-page.component.ts`, `uploadImage`: `'UPLOAD_PURPOSE_WIKI'`. Проверить поиском, что в `features/wiki` больше нет `UPLOAD_PURPOSE_NEWS` (обложка и картинки текста идут через `uploadImage`).

## F. i18n (ru / en)
- `wiki.editor.conflict.title`: `Статью изменили, пока вы её правили` / `The article changed while you were editing`
- `wiki.editor.conflict.text`: `Ниже — чем ваш текст отличается от версии на сервере. Ваш текст сохранён в браузере и не пропадёт.` / `Below is how your text differs from the version on the server. Your text is saved in this browser and will not be lost.`
- `wiki.editor.conflict.keepMine`: `Оставить мою версию` / `Keep my version`
- `wiki.editor.conflict.takeServer`: `Взять версию с сервера` / `Use the server version`
- `wiki.editor.suggestLimit`: `У вас уже 5 предложений на проверке. Дождитесь решения по ним.` / `You already have 5 proposals waiting for review. Wait for a decision on them.`
- `wiki.editor.suggestOutdated`: `Статью изменили, пока вы писали правку. Обновите страницу — ваш текст сохранён в браузере.` / `The article changed while you were writing. Reload the page — your text is saved in this browser.`
- `wiki.review.stale`: `Статью изменили после того, как игрок написал правку (версия {{from}} → {{to}}). При одобрении текст игрока заменит эти изменения.` / `The article changed after this edit was written (version {{from}} → {{to}}). Approving it will replace those changes with the player’s text.`
- `wiki.review.staleUnknown`: `Предложение старое: неизвестно, от какой версии статьи оно написано. Сверьте с текущей статьёй перед одобрением.` / `This is an old proposal: the article version it was written against is unknown. Compare it with the current article before approving.`
- `wiki.review.showSince`: `Показать, что изменилось с тех пор` / `Show what changed since`
- `wiki.review.staleConfirm`: `Текст игрока заменит изменения, сделанные в статье после его правки. Одобрить?` / `The player’s text will replace changes made to the article after this edit. Approve?`
- `wiki.review.staleNow`: `Статью только что изменили. Посмотрите, что поменялось, и одобрите ещё раз.` / `The article was just changed. Check what changed and approve again.`
- `wiki.review.alreadyReviewed`: `Это предложение уже рассмотрел другой редактор.` / `Another editor has already reviewed this proposal.`
Положить рядом с существующими ветками `wiki.editor.*` и `wiki.review.*` — проверить, где они лежат в `wiki.i18n.ts`.

## Проверка исполнителем
- `npm run verify`, `npm test` (новый спек проходит), `npx ng build` — 0 ошибок.
- Руками, два браузера (или обычное окно + инкогнито) под двумя редакторами:
  1. оба открыли одну статью, первый сохранил, второй сохранил → окно конфликта со сравнением; обе кнопки работают;
  2. адрес новой статьи совпал с существующим → подсказка у поля адреса;
  3. игрок предложил правку → редактор сохранил статью → в очереди у правки предупреждение и второе сравнение; одобрение спрашивает подтверждение и проходит;
  4. игрок прикрепил картинку к предложению — загрузка прошла.
- Если vsservice tasks/002–003 ещё не на стенде — пункты 3–4 не проверять и написать об этом в отчёте.

## Не делать
- трёхстороннее слияние текста;
- не менять внешний вид очереди, кроме блока предупреждения;
- не трогать загрузку картинок в новостях.

## Отчёт
≤10 строк: что сделано, что нет, результаты проверок 1–4. `git commit` + `git push -u origin agent/004`.
