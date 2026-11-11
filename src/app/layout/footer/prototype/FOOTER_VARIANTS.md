# Прототип подвала: три варианта под одной идеей очага

> **Что это.** Контракт прототипа подвала. Вариант — самостоятельный подвал
> целиком: он заменяет боевой `<app-footer />` и обязан нести все данные
> боевого подвала. Включается параметром `?fvariant=<id>`, без параметра
> рисуется боевой подвал. Прототип удаляется целиком вместе с папкой
> `src/app/layout/footer/prototype/`.

## 1. Управление

| Что                          | Как                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Открыть вариант              | `http://127.0.0.1:4310/?fvariant=ember-field`                                               |
| Значения параметра           | `ember-field` · `hearth-gate` · `night-skyline`                                             |
| Переключение                 | Плавающая пилюля внизу экрана: стрелки, клавиши `←` `→`, закрытие — `×` или `Esc`          |
| Клавиши в полях ввода        | Не перехватываются: `input`, `textarea`, `select`, `contenteditable` получают их как обычно |
| Production                   | Пилюля не рендерится; вариант остаётся доступен только по параметру адреса                  |
| Гидратация                   | Начальный рендер на сервере — боевой подвал; вариант подставляется после `afterNextRender`  |

Параметр адреса обновляется через `router.navigate(..., { queryParamsHandling: 'merge', replaceUrl: true })`,
поэтому внутренние переходы по ссылкам подвала вариант не сбрасывают.

## 2. Данные подвала

Единственный источник — `FooterPrototypeState` (сигналы), объявленный
в провайдерах хоста `FooterPrototypeComponent`.

| Данные              | Значение                                                              | Источник                                  |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `navLinks`          | 16 разделов сайта с `route` и i18n-ключом                             | `../config/footer-nav-links.constant.ts`  |
| `socialLinks`       | Boosty, DonationAlerts, Discord, YouTube: адрес, иконка, i18n-ключ    | повторяют боевой подвал                   |
| `discordInviteUrl`  | `environment.discordInviteUrl`                                        | `@core/config/environments/environment`   |
| `siteVersion`       | `environment.siteVersion`                                             | там же                                    |
| `siteVersionDate`   | `environment.siteVersionDate`                                         | там же                                    |
| `docsUrl`           | `https://docs.lasthearth.ru/` — адрес за строкой версии               | повторяет боевой подвал                   |
| `logoSrc`           | `/images/logo.webp`                                                   | повторяет боевой подвал                   |
| `copyright`         | `© lasthearth.ru 2025-2026` — литерал, как в боевом подвале           | литерал                                   |

Каждый вариант обязан вывести: логотип, копирайт, `footer.rights`,
все 16 пунктов `navLinks`, ссылки `footer.faq` / `footer.privacyPolicy` /
`footer.publicOffer`, строку `footer.version` ссылкой на `docsUrl`,
четыре иконки соцсетей. Порядок и раскладку вариант выбирает сам.

### Ключи словаря — только существующие

`footer.logoAlt`, `footer.rights`, `footer.nav.title`, `footer.nav.about`,
`footer.nav.startGame`, `footer.nav.rules`, `footer.nav.wiki`, `footer.nav.faq`,
`footer.nav.settlements`, `footer.nav.keyPoints`, `footer.nav.players`,
`footer.nav.map`, `footer.nav.diplomacy`, `footer.nav.events`, `footer.nav.lfg`,
`footer.nav.gallery`, `footer.nav.videos`, `footer.nav.mods`, `footer.nav.market`,
`footer.faq`, `footer.privacyPolicy`, `footer.publicOffer`, `footer.version`,
`footer.social.boosty`, `footer.social.donationAlerts`, `footer.social.discord`,
`footer.social.youtube`.

Новые ключи не добавляются. Служебные подписи прототипа (пилюля, `title`,
`aria-label` кнопок переключателя) — литералы в шаблоне.

## 3. Правила

**Цвет.** Только токены `--lh-*` из `src/styles.css`. Текст — `*-ink`
на светлом и `--lh-parchment*` на тёмном. Контраст AA. Тёмная тема —
только подмена значений переменных через `:host-context(html[data-theme='dark'])`,
никаких отдельных селекторов для тёмного вида. Производные оттенки —
`color-mix(in srgb, var(--lh-…) N%, transparent)`, а не литералы `rgba()`.

**Движение.** Токены `--lh-dur-fast|mid|slow` и `--lh-ease-smooth|spring|out-quart`.
`transition: all` и дефолтные `ease` запрещены. Ховер цвета — мгновенный,
без перехода. Ничего дольше 300ms, кроме входа панели (до 400ms) и бесконечных
циклов 2.5–4s. У каждой анимации ветка `@media (prefers-reduced-motion: reduce)`:
в ней всё видно и неподвижно.

**Canvas.** `requestAnimationFrame` с отпиской в `DestroyRef`; пауза, когда
подвал вне вьюпорта (`IntersectionObserver`); не больше ~120 частиц; учёт
`devicePixelRatio` (не выше 2). При `prefers-reduced-motion: reduce` —
один статичный кадр, цикл не запускается.

**Доступность.** Ориентир `<footer>` уже несёт обёртка в `layout.component.html`,
а вложенный `<footer>` невалиден, поэтому корень варианта — именованная
область: `div` с `aria-label` (литерал прототипа). Цели нажатия не меньше
44px; у декоративного слоя `aria-hidden="true"`; фокус-кольцо не перекрывать
и не прятать (`outline`, не `box-shadow`).

**Код.** `standalone`, `ChangeDetectionStrategy.OnPush`, селектор `app-*`,
JSDoc на русском у публичных элементов, без `any` и `console.log`.
Появление контента — `[appReveal]`, единственный механизм появления при прокрутке.

**ССР и пререндер.** Контент виден без JS: скрытое стартовое состояние
ставится только после гидратации классом-«взводом» (`.gate--armed`),
а не в базовых правилах. Ветка `prefers-reduced-motion` показывает финальный
кадр сразу.

### Запреты исполнителю варианта

- Править чужие файлы нельзя: только своя папка `variants/<id>/`.
- Нельзя запускать `ng build`, `ng serve`, `npm run verify`.
- Разрешено: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`,
  `node scripts/check-design-tokens.mjs`, `node scripts/check-contrast.mjs`,
  `node_modules/.bin/lessc --lint <файл>.less`.

## 4. Файлы и классы

Все пути — от `src/app/layout/footer/prototype/`.

| Файл                                                       | Класс / имя                  | Селектор                       | Назначение                                    |
| ---------------------------------------------------------- | ---------------------------- | ------------------------------ | --------------------------------------------- |
| `FOOTER_VARIANTS.md`                                       | —                            | —                              | этот контракт                                 |
| `footer-prototype.component.ts\|html\|less`                | `FooterPrototypeComponent`   | `app-footer-prototype`         | хост: читает `?fvariant=`, рисует вариант или `app-footer`, держит провайдер данных |
| `footer-prototype-switcher.component.ts\|html\|less`       | `FooterPrototypeSwitcherComponent` | `app-footer-prototype-switcher` | плавающая пилюля: стрелки, клавиши, подпись, закрытие |
| `footer-prototype-state.service.ts`                        | `FooterPrototypeState`       | —                              | данные подвала сигналами                      |
| `config/footer-prototype-variants.constant.ts`             | `FOOTER_PROTOTYPE_VARIANTS`  | —                              | порядок вариантов и подписи пилюли            |
| `model/footer-variant.model.ts`                            | `FooterVariantId`, `FooterVariantOption` | —                  | тип идентификатора и опции                    |
| `model/footer-social-link.interface.ts`                    | `FooterSocialLink`           | —                              | адрес, иконка, ключ подписи соцсети           |
| `variants/ember-field/ember-field.component.ts\|html\|less` | `EmberFieldComponent`       | `app-footer-ember-field`       | вариант «Угольки»                             |
| `variants/hearth-gate/hearth-gate.component.ts\|html\|less` | `HearthGateComponent`       | `app-footer-hearth-gate`       | вариант «Врата очага»                         |
| `variants/night-skyline/night-skyline.component.ts\|html\|less` | `NightSkylineComponent` | `app-footer-night-skyline`     | вариант «Ночной силуэт»                       |

Общая вау-идея — огонь и очаг, но структура у вариантов разная: частицы,
край пергамента, ночной силуэт. Локальные переменные варианта объявляются
на корне и переопределяются в `:host-context(html[data-theme='dark'])`.

## 5. Направления вариантов

| Вариант        | Идея                                                                                                                                                                              | Движение                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ember-field`  | Canvas 2D: угольки поднимаются от верхней кромки подвала; над кромкой ASCII-строка огня из мерцающих символов; указатель подмешивает лёгкий ветер                                 | Частицы — rAF, пауза вне вьюпорта; ASCII-строка перерисовывается каждые ~110ms; `reduced-motion` — статичный кадр |
| `hearth-gate`  | Верхняя кромка подвала — рваный обгоревший край пергамента (`clip-path` + маска); при входе во вьюпорт по кромке пробегает янтарная линия, контент раскрывается каскадом; крупный вензель «LAST HEARTH» проявляется маской снизу вверх один раз | Каскад — `[appReveal]` с задержкой 80ms на группу; линия — 400ms; вензель — 400ms один раз |
| `night-skyline`| Слоёные параллакс-силуэты (деревня, ели, стена) оседают при прокрутке в подвал, звёзды мерцают, луна светит; CTA «В Discord» с магнитным ховером                                     | Слои — сдвиг от прогресса прокрутки; звёзды и луна — бесконечные циклы 3.2–4s; магнит — 200ms `--lh-ease-spring`      |

## 6. Что проверяется перед сдачей

1. `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`
2. `node scripts/check-design-tokens.mjs`
3. `node scripts/check-contrast.mjs`
4. `node_modules/.bin/lessc --lint` по каждому `.less` варианта
5. Скриншоты `shots/footer-<id>-1440.png` и `shots/footer-<id>-390.png`
   при прокрутке до подвала: `node /tmp/lh-shot.mjs --url "<url>&nowelcome" --out ... --scroll 99999 --wait 6000`