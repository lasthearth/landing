# 002 — Wiki: автор, тире, заголовки, ссылки на игроков, шпаргалка, лицензия

Цель: шесть правок вики по запросу владельца (см. разделы A–F).
Ветка: agent/002 от feat/wiki.
Зависимость: раздел A использует поле `created_by` из vsservice tasks/001. Пока бэкенд его не отдаёт, работает запасной вариант (см. A2), поэтому ждать бэкенд не нужно.

Правила проекта: AGENTS.md. JSDoc на русском у каждого нового публичного элемента. Цвета — только токены `--lh-*`. Тексты — сразу ru и en через `npm run i18n -- set wiki <путь> "<текст>"` (если кавычки или HTML ломают команду в pwsh — правь словарь руками), в конце `npm run i18n -- check`.

Пути ниже — от `src/app/`.

## A. Автор виден всегда
1. `entities/wiki/model/wiki.types.ts`: в `WikiArticleDto` добавить `created_by?: string;`.
2. `entities/wiki/model/wiki-article.model.ts`: в `WikiArticle` добавить `readonly createdBy: string;` (JSDoc: «Кто создал статью; не меняется при правках»). `authorName`: JSDoc «Кто правил последним».
   `entities/wiki/model/wiki.mapper.ts`, `mapArticleFromDto`: `createdBy: dto.created_by || dto.author_name || '',`.
   Везде, где собирается объект `WikiArticle` руками (компилятор покажет; например `wiki-editor-page.component.ts` около строки 706), заполнить `createdBy`: для новой статьи — тем же значением, что `authorName`; для существующей — прежним `createdBy`.
3. `features/wiki/ui/wiki-article-view/wiki-article-view.component.ts`: новый вход `public readonly createdBy = input('');`. Имена догружать для обоих id (`createdBy` и `authorName`) через уже используемый `WikiAuthorNameService`. Вычисляемые:
   - `createdLabel` — имя автора;
   - `editorLabel` — имя последнего редактора, но только если `authorName()` не пустой и не равен `createdBy()`, иначе `''`.
4. Шаблон `wiki-article-view.component.html`, блок `<footer class="wiki-view__footer">` (около строки 130): footer показывается, если есть `createdLabel()`. Внутри:
   - строка 1: иконка `@tui.feather` + `"wiki.view.author" | translate: { name: createdLabel() }`;
   - строка 2, только если `editorLabel()`: иконка `@tui.pencil-line` + `"wiki.view.editedBy" | translate: { name: editorLabel() }`;
   - строка лицензии — см. F3 (она показывается всегда, вне условия про автора).
   Строки — столбиком, отступ между ними `0.25rem`, стиль как у существующего footer.
5. Передать `[createdBy]`:
   - `wiki-article-page.component.html`: `[createdBy]="article()!.createdBy"`;
   - `wiki-suggestions.component.html`: `[createdBy]="target(item)?.createdBy || item.authorName"` (новая статья — автор предложения).
6. `wiki-list-page.component.ts` (строки ~259 и ~271): в карточках подписывать `createdBy` вместо `authorName` (и догружать имена по `createdBy`).
7. i18n (ru / en):
   - изменить `wiki.view.author`: `Автор — {{name}}` / `Author: {{name}}`
   - новый `wiki.view.editedBy`: `Последняя правка — {{name}}` / `Last edited by {{name}}`

## B. Длинное тире и кнопки «—» и «неразрывный пробел»
1. Тире стоит высоко из-за шрифта Advent Pro. Подменяем шрифт только для тире. В `src/styles.css` перед правилом `html body` добавить:
   ```css
   /**
    * Тире из системного шрифта: у Advent Pro «—» и «–» стоят почти на уровне
    * верхней части строчных букв. unicode-range ограничивает подмену двумя символами.
    */
   @font-face {
       font-family: 'LH Dash';
       src: local('Arial'), local('Helvetica Neue'), local('Helvetica'), local('Roboto'), local('Segoe UI'), local('DejaVu Sans');
       unicode-range: U+2013-2014;
   }
   ```
   и поставить `'LH Dash'` первым в `font-family` трёх правил `styles.css`, где сейчас `'Advent Pro', serif !important` (`html body`, `tui-dialog .t-content`, `tui-hint`), а также в `features/wiki/ui/wiki-markup-input/wiki-markup-input.component.less` (строка ~368, шрифт поля ввода). Другие шрифты не трогать.
2. Команды редактора, `features/wiki/lib/wiki-commands.constant.ts`:
   - в `WikiCommandId` добавить `'dash' | 'nbsp'`;
   - `dash: { id: 'dash', icon: '@tui.move-horizontal' }`, `nbsp: { id: 'nbsp', icon: '@tui.space' }` (обе иконки есть в пакете);
   - в `WIKI_TOOLBAR` — новая группа `['dash', 'nbsp']` сразу после группы `['bold', …, 'spoiler']`.
3. `wiki-markup-input.component.ts`, `switch (id)` в обработчике команд:
   - `dash`: вставить `\u00A0— ` (неразрывный пробел, тире, обычный пробел). Если символ перед курсором — обычный пробел, заменить его, чтобы не было двух пробелов подряд. Вставлять через `replaceRange` (сохраняет Ctrl+Z).
   - `nbsp`: вставить `\u00A0` через `replaceRange`.
4. i18n:
   - `wiki.cmd.dash`: `Длинное тире` / `Em dash`
   - `wiki.cmd.nbsp`: `Неразрывный пробел` / `Non-breaking space`
   - `wiki.cmdHint.dash`: `Тире с неразрывным пробелом перед` / `Dash with a non-breaking space before it`
   - `wiki.cmdHint.nbsp`: `Пробел, на котором строка не переносится` / `A space the line never breaks at`

## C. Четыре уровня заголовков в тексте
Синтаксис: `##` → h2, `###` → h3, `####` → h4, `#####` → h5. Одна `#` по-прежнему даёт h2 (уже написанные статьи не меняются).
1. `entities/wiki/model/wiki-article.model.ts`: `WikiHeading.level: 2 | 3 | 4 | 5`.
2. `features/wiki/lib/render-wiki-markdown.function.ts`:
   - `RE.heading`: `/^(#{1,5})\s+(.+?)\s*#*\s*$/`;
   - `const level = Math.max(2, heading[1].length) as WikiHeading['level'];`;
   - в оглавление (`ctx.headings.push…`) попадают все уровни: фильтрует уже оглавление (см. п. 4);
   - комментарий в JSDoc функции (строка ~127) обновить: `## … #####`.
3. Стили `wiki-article-view.component.body.less`, рядом с `h3.wiki-h`:
   ```less
   h4.wiki-h,
   h5.wiki-h {
       margin-top: 1.1em;
       font-family: inherit; // Almendra на мелком кегле читается плохо (DESIGN_SYSTEM)
   }
   h4.wiki-h { font-size: 1.08em; }
   h5.wiki-h { font-size: 1em; color: var(--lh-ink-2); }
   ```
4. Оглавление. Показывать уровни 2–4, h5 — не показывать.
   - `wiki-article-view.component.html` (~строка 82): `@for (heading of tocHeadings(); …)`, где `tocHeadings` = `headings()` с `level <= 4`; классы `[class.wiki-view__toc-sub]="heading.level === 3"` и `[class.wiki-view__toc-sub2]="heading.level === 4"`. В `.head.less` рядом с `.wiki-view__toc-sub` добавить `.wiki-view__toc-sub2` с отступом в два раза больше, чем у `-sub`.
   - Оглавление редактора `wiki-editor-page.component.html` (~строка 622): так же — h5 не показывать, h4 — класс `we__outline-sub2` с двойным отступом (`.sidebar.toc.less` рядом с `.we__outline-sub`).
5. `features/wiki/lib/lint-wiki-article.function.ts` (~строки 108–116): правило `headingJump` обобщить — предупреждение, если уровень заголовка больше предыдущего более чем на 1 (первый заголовок сравнивается с 2). Код и текст ключа те же.
6. Редактор:
   - `wiki-commands.constant.ts`: `h4: { id: 'h4', icon: '@tui.heading-4', hotkey: 'Ctrl+Alt+4', slash: true, keywords: 'заголовок heading h4' }`, `h5` аналогично (`@tui.heading-5`, `Ctrl+Alt+5`, `h5`); в `WikiCommandId` добавить `'h4' | 'h5'`; группа панели `['h2', 'h3', 'h4', 'h5']`.
   - `wiki-markup-input.component.ts`: `case 'h4': return this.toggleHeading('#### ');`, `case 'h5': return this.toggleHeading('##### ');`; в `hotkey()` добавить `Digit4` → h4, `Digit5` → h5; `ANY_PREFIX`: `#{1,5}`; иконка подсказки якорей (строка ~293) — ``@tui.heading-${heading.level}``.
7. i18n:
   - `wiki.cmd.h4`: `Малый заголовок` / `Small heading`
   - `wiki.cmd.h5`: `Заголовок абзаца` / `Paragraph heading`
   - `wiki.cmdHint.h4`: `Внутри подраздела, в оглавлении с отступом` / `Inside a subsection, indented in contents`
   - `wiki.cmdHint.h5`: `Подпись над абзацем, в оглавление не попадает` / `Label above a paragraph, not in contents`

## D. Ссылка на игрока, которая переживёт смену ника
Синтаксис: `[[player:<user_id>]]` или `[[player:<user_id>|текст]]`. В тексте хранится постоянный id игрока, ник подставляется при показе.
1. `render-wiki-markdown.function.ts`:
   - `WikiRenderOptions`: `readonly resolvePlayer?: (id: string) => string | null;` (JSDoc: «Текущий ник по id игрока; null — ещё не известен»);
   - `WikiRenderLabels` + `DEFAULT_LABELS`: `player: 'игрок'`;
   - `WikiRender` (в модели) и `Ctx`: `playerIds: readonly string[]` (уникальные id из текста);
   - в `renderWikiLink` перед разбором `kbd:`: `/^player:\s*(.+)$/i`. id проверять `/^[A-Za-z0-9_-]{4,64}$/`, иначе `ctx.notes.push({ kind: 'badPlayer', line, detail: id })` и `return null` (добавить `'badPlayer'` в `WikiRenderNote.kind`). Ник `nick = ctx.resolvePlayer?.(id) ?? null`. Текст ссылки: `label`, если есть, иначе ник, иначе `ctx.labels.player`. Если ник известен — `<a class="wiki-link wiki-link--player" href="/player/${encodeURIComponent(nick)}">…</a>`, иначе `<span class="wiki-link--player">…</span>`. Всё экранировать как в соседних ветках.
2. Три места, где вызывается `renderWikiMarkdown`: `wiki-article-page.component.ts`, `wiki-editor-page.component.ts` (~313), `wiki-suggestions.component.ts` (~144). В каждом:
   - передать `resolvePlayer: (id) => this.authorNames.name(id)` (`WikiAuthorNameService` из `@entities/wiki`, inject, если его нет). Он уже переводит id пользователя в игровой ник и кэширует;
   - добавить `effect`: при изменении `playerIds` результата разбора вызвать `untracked(() => void this.authorNames.resolve(ids))`. Разбор пересчитается сам, когда придут ники, потому что `name()` читает сигнал.
3. Стиль `wiki-article-view.component.body.less` рядом с `a.wiki-link`: `.wiki-link--player::before { content: '@'; opacity: 0.6; }`.
4. Вставка в редакторе:
   - команда `playerLink: { id: 'playerLink', icon: '@tui.at-sign', slash: true, keywords: 'игрок ник профиль player nick' }`, в `WikiCommandId`, в группу панели `['link', 'wikiLink', 'playerLink', 'ruleLink', 'kbd', 'footnote']`;
   - обработчик: `return this.startLink('player:');`;
   - подсказки (computed около строки 285): если `state.query.startsWith('player:')`, показывать результаты поиска игроков: `{ key: user_id, icon: '@tui.user', label: user_game_name, hint: '/player/' + user_game_name, run: () => this.completeLink(state, 'player:' + user_id) }`. Поиск — `SettlementService.searchUser$(query)` из `@entities/settlement` (тот же, что в приглашениях в поселение). Запрос дёргать при длине запроса ≥ 2 символов, с задержкой 250 мс, результат держать в сигнале `playerResults`; ошибку глушить (пустой список). Отменять предыдущий запрос при новом вводе.
5. `lint-wiki-article.function.ts` уже превращает заметки разбора в замечания — нужен только текст.
6. i18n:
   - `wiki.cmd.playerLink`: `Игрок` / `Player`
   - `wiki.cmdHint.playerLink`: `Ссылка на профиль, не ломается при смене ника` / `Profile link that survives a nickname change`
   - `wiki.render.player`: `игрок` / `player`
   - `wiki.lint.badPlayer`: `Неверная ссылка на игрока: {{detail}}` / `Invalid player link: {{detail}}`
   (проверь, что `badRule` лежит в том же объекте `wiki.lint` — ключ `badPlayer` положить рядом).
   В `wiki-editor-page.component.ts`, где собираются подписи разбора (~строка 282–290), добавить `player: t('player')`.

## E. Шаблонная статья-шпаргалка
`features/wiki/lib/wiki-templates.constant.ts`, шаблон `id: 'demo'`:
1. Строку `Разделы \`##\` попадают в оглавление…` заменить на: `Заголовки бывают четырёх уровней: \`##\`, \`###\`, \`####\` и \`#####\`. Первые три попадают в оглавление.` и сразу после неё вставить примеры:
   ```
   #### Малый заголовок
   ##### Заголовок абзаца
   ```
2. В конец `body` добавить раздел (у блоков кода уже есть кнопка «Копировать»):
   ```
   ## Спецсимволы
   Неразрывный пробел не даёт строке разорваться между словами: «5 000 монет», «10 км». На панели есть кнопки «Неразрывный пробел» и «Длинное тире». Можно скопировать символ отсюда:

   ``` (тройные кавычки кода)
   <здесь один символ U+00A0>
   ```

   Длинное тире ставится с пробелами: «Мост — единственный путь».

   ```
   —
   ```

   ## Ссылка на игрока
   Вставьте кнопкой «Игрок» и выберите ник из списка. В тексте сохранится постоянный номер: \`[[player:номер]]\`. Если игрок сменит ник, ссылка покажет новый.
   ```
   Неразрывный пробел в строке TS писать как `\u00A0`, в «5 000» и «10 км» — тоже `\u00A0`.

## F. Лицензия и правила для авторов
1. Согласие при отправке предложения. `wiki-editor-page.component.ts/.html`:
   - сигнал `licenseAccepted`, начальное значение из `localStorage` по ключу `lh.wiki.licenseAccepted` (с проверкой, что код в браузере — сайт пререндерится); при отметке — записать `'1'`;
   - в панели свойств, сразу после поля «Комментарий» (`id="wiki-note"`, ~строка 602–614), только когда `!isEditor || suggestMode`: блок как у быстрого ответа (`label.we-switch` + `input.lh-checkbox`). Текст: `wiki.public.licenseConsent`, после него ссылка `<a routerLink="/public-offer" target="_blank">` с текстом `wiki.public.licenseTerms`; обёртке поля — `id="wf-license"` и `[class.we-field--bad]="licenseMissing()"`;
   - в `submitForReview()` после проверки ошибок: если не отмечено — `licenseMissing.set(true)`, `tab.set('props')`, `sideOpen.set(true)`, встряска кнопки как при ошибках, и выход. Отметка сбрасывает `licenseMissing`.
2. i18n:
   - `wiki.public.licenseConsent`: `Я автор этого текста и картинок или имею право их публиковать. Согласен на публикацию под лицензией CC BY-SA 4.0.` / `I am the author of this text and images or have the right to publish them. I agree to publish them under CC BY-SA 4.0.`
   - `wiki.public.licenseTerms`: `Условия (оферта, раздел 8)` / `Terms (offer, section 8)`
3. Подпись лицензии внизу статьи (`wiki-article-view.component.html`, footer, всегда, кроме `preview()`): `{{ "wiki.view.license" | translate }} <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru" target="_blank" rel="noopener license">CC BY-SA 4.0</a>`. Приглушённый мелкий текст (`var(--lh-ink-3)`). Адрес — константой в компоненте. Footer теперь показывается всегда, а строки автора — по условиям из A4.
   - `wiki.view.license`: `Материалы статьи доступны по лицензии` / `Article content is available under`
4. Оферта: новый раздел «8. Пользовательские материалы», «Реквизиты» становятся разделом 9.
   - `core/i18n/translations/features/legal.i18n.ts`, в обеих локалях: в `legal.publicOffer.sections.requisites` заменить `8.` на `9.` в `title` и в номерах `8.1`…`8.5` внутри `p1`…`p5`. Перед `requisites` добавить объект `userContent` (тексты ниже, HTML как в соседних ключах).
   - `features/public-offer/public-offer/public-offer.component.html`: перед блоком `<!-- 8. Contractor details -->` — такой же блок `lh-panel` для `userContent` (заголовок + `p1`…`p6`), комментарий `<!-- 8. User content -->`, у реквизитов комментарий → `9`.
   - `public-offer.component.ts`: флаг `isUserContent` с JSDoc, добавить его в «развернуть все» (~строка 116, рядом с остальными флагами).

Тексты `userContent`, ru:
```
title: '8. Пользовательские материалы',
p1: '<span class="font-bold">8.1</span> Пользователь может размещать на Сайте материалы (тексты, изображения, ссылки), в том числе в разделе «Вики». Размещая материал, Пользователь подтверждает, что является его автором или имеет право разместить его на условиях настоящего раздела.',
p2: '<span class="font-bold">8.2</span> Исключительное право на материал остаётся у автора. Размещая материал, Пользователь безвозмездно предоставляет Исполнителю и любым третьим лицам простую (неисключительную) лицензию на условиях открытой лицензии Creative Commons «С указанием авторства — С сохранением условий» 4.0 (<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru" target="_blank" class="text-ink-2 font-bold border-dashed border-b border-wood hover:text-ink transition-all duration-100">CC BY-SA 4.0</a>) в соответствии со статьёй 1286.1 ГК РФ, на весь срок действия исключительного права, на территории всего мира. Материал можно воспроизводить, распространять, изменять и переводить при условии указания автора и распространения производных материалов на тех же условиях.',
p3: '<span class="font-bold">8.3</span> Исполнитель вправе редактировать материалы, объединять их с материалами других Пользователей, отказывать в размещении и удалять материалы. Одобрение материала модератором означает только его соответствие правилам Проекта и не является проверкой прав на него.',
p4: '<span class="font-bold">8.4</span> Ответственность за нарушение прав третьих лиц размещённым материалом несёт разместивший его Пользователь. Пользователь самостоятельно урегулирует претензии правообладателей, предъявленные в связи с его материалом.',
p5: '<span class="font-bold">8.5</span> Правообладатель, считающий, что материал на Сайте нарушает его права, может направить уведомление на email <a href="mailto:lisovfox2002@gmail.com" class="text-ink-2 font-bold border-dashed border-b border-wood hover:text-ink transition-all duration-100">lisovfox2002@gmail.com</a>, указав ссылку на материал и сведения, подтверждающие права. Исполнитель ограничивает доступ к материалу не позднее 3 рабочих дней с момента получения уведомления и сообщает об этом разместившему его Пользователю.',
p6: '<span class="font-bold">8.6</span> Запрещено размещать материалы, нарушающие законодательство РФ, права третьих лиц и правила Проекта.',
```
en:
```
title: '8. User Content',
p1: '<span class="font-bold">8.1</span> The User may post content (texts, images, links) on the Site, including the Wiki section. By posting content, the User confirms that they are its author or have the right to post it under the terms of this section.',
p2: '<span class="font-bold">8.2</span> The exclusive right to the content remains with its author. By posting content, the User grants the Contractor and any third parties a free, simple (non-exclusive) license under the Creative Commons Attribution-ShareAlike 4.0 license (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" class="text-ink-2 font-bold border-dashed border-b border-wood hover:text-ink transition-all duration-100">CC BY-SA 4.0</a>) in accordance with Article 1286.1 of the Civil Code of the Russian Federation, worldwide, for the entire term of the exclusive right. The content may be reproduced, distributed, modified and translated, provided the author is credited and derivative works are distributed under the same terms.',
p3: '<span class="font-bold">8.3</span> The Contractor may edit content, combine it with content of other Users, refuse to publish it and remove it. Approval by a moderator only means that the content complies with the Project rules; it is not a check of rights to the content.',
p4: '<span class="font-bold">8.4</span> The User who posted content is liable for any infringement of third-party rights by that content and settles right holders\' claims related to it on their own.',
p5: '<span class="font-bold">8.5</span> A right holder who believes that content on the Site infringes their rights may send a notice to <a href="mailto:lisovfox2002@gmail.com" class="text-ink-2 font-bold border-dashed border-b border-wood hover:text-ink transition-all duration-100">lisovfox2002@gmail.com</a> with a link to the content and information confirming their rights. The Contractor restricts access to the content within 3 business days of receiving the notice and informs the User who posted it.',
p6: '<span class="font-bold">8.6</span> Posting content that violates the laws of the Russian Federation, third-party rights or the Project rules is prohibited.',
```

## Шаги
A → B → C → D → E → F, после каждой буквы — `npx ng build` и отдельный коммит `LH | feat(wiki): …`.

## Проверка исполнителем
- `npm run verify` и `npx ng build` — 0 ошибок и 0 предупреждений;
- `npm run i18n -- check` — без расхождений;
- открыть шаблон «Шпаргалка» в редакторе: заголовки 4 уровней, оглавление с отступами, блоки копирования; кнопки «—», «неразрывный пробел», «Игрок» работают, Ctrl+Z отменяет вставку.

## Готово, когда
- внизу статьи всегда «Автор — X»; «Последняя правка — Y» — только если Y ≠ X; строка лицензии на месте;
- `[[player:id]]` показывает текущий ник и ведёт на `/player/<ник>`;
- игрок не может отправить предложение без галочки согласия;
- в оферте раздел 8 «Пользовательские материалы», реквизиты — 9.

## Не делать
- не менять бэкенд, API-клиент (кроме полей из A), роуты, другие страницы;
- не переименовывать существующие ключи i18n (кроме изменения текста `wiki.view.author`);
- не трогать `.dsh/wiki-stage/`;
- никаких «улучшений по пути».

## Отчёт
≤10 строк: что сделано по каждой букве, что нет, вывод `npm run verify` и `ng build`. Обязательно: `git push -u origin agent/002`, затем `docs/project-map.md` не нужен (новых файлов нет).
