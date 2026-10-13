# 005 — Wiki: заголовок, описание и превью у каждой статьи, статьи в sitemap

Цель: у всех статей вики одинаковые SEO-данные. Маршрут `wiki/:slug` берёт статичный `routeSeoData.wikiArticle` («Статья вики — Last Hearth», адрес `/wiki`), поэтому вкладка браузера, поисковик и превью ссылки в Discord видят одно и то же у любой статьи. В `public/sitemap.xml` нет ни `/wiki`, ни статей.

Ветка: agent/005 от agent/003 (страница статьи переписана там).

Правила проекта: AGENTS.md. JSDoc на русском. Тексты — `npm run i18n -- set …`, в конце `npm run i18n -- check`.

Пути ниже — от `src/app/`, если не указано иное.

## A. SEO статьи
Образец — `features/news/ui/news-page/news-page.component.ts` (`onStateChange`, `applySeo`): та же схема, те же поля.
1. В `WikiArticlePageComponent` при переходе в состояние:
   - `ready` → `seo.setSeoTags({...})`:
     - `title`: `${article.title} — ${t('wiki.seo.suffix')}`;
     - `description`: `article.lead`, если не пустой; иначе начало текста без разметки, до 160 символов с `…` (функцию очистки — в `features/wiki/lib/wiki-plain-text.function.ts`: убрать `#`, `**`, `[[…|текст]]` → текст, `![…](…)`, `:::` и строки-разделители; юнит-тест на 4–5 случаев);
     - `keywords`: теги через запятую;
     - `url`: `https://lasthearth.ru/wiki/${article.slug}` (константа `SITE_URL` — как в news-page);
     - `type: 'article'`, `locale: 'ru_RU'`, `siteName: 'Last Hearth'`;
     - `image`: `article.cover?.url` или `${SITE_URL}/og-image.jpg`; `imageAlt`: заголовок;
     - `robots`: черновик (`status === 'draft'`) → `noindex, nofollow`; опубликованная → `index, follow, max-image-preview:large`.
   - `not-found` → как в news-page: `t('wiki.public.notFound') + ' — Last Hearth'`, `robots: 'noindex, follow'`.
2. JSON-LD. В `core/services/seo.service.ts` новый метод:
   ```ts
   /**
    * Ставит или убирает блок структурированных данных страницы.
    *
    * @param id Идентификатор блока: повторный вызов с тем же id заменяет его.
    * @param data Объект schema.org или `null`, чтобы убрать блок.
    */
   public setJsonLd(id: string, data: object | null): void
   ```
   `<script type="application/ld+json" id="ld-${id}">` в `head`, через `Renderer2` (как canonical в этом же сервисе). Содержимое — `JSON.stringify(data)` с заменой `<` на `<`, чтобы текст статьи не мог закрыть тег.
   Статья ставит:
   - `id: 'wiki-article'` — `{ "@context": "https://schema.org", "@type": "Article", headline, description, image, dateModified: updatedAt, author: { "@type": "Person", name: <имя автора, если уже известно> }, mainEntityOfPage: url }`;
   - `id: 'wiki-faq'` — только если есть `quickAnswer`: `FAQPage` с одним `Question` / `acceptedAnswer`.
   При уходе со страницы (`DestroyRef.onDestroy`) и при `not-found` — оба блока `null`.
3. i18n: `wiki.seo.suffix`: `Вики Last Hearth` / `Last Hearth Wiki`.

## B. sitemap
1. Скрипт `scripts/gen-sitemap.mjs` (ESM, без новых зависимостей, Node `fetch`):
   - статичные адреса — из `routes.txt`, без `/404`; `priority` и `changefreq` для них — таблица в начале скрипта, значения перенести из текущего `public/sitemap.xml` (`/home` — 1.0 daily и т. д.); `/wiki` — 0.9 daily;
   - статьи — `GET ${WIKI_API_URL}/wiki/articles?page_size=50&page_token=…` по всем страницам (без токена сервер отдаёт только опубликованные), `WIKI_API_URL` из переменной окружения, по умолчанию `https://api.lasthearth.ru/v1`; адрес `https://lasthearth.ru/wiki/<slug>`, `lastmod` — дата из `updated_at`, `changefreq: weekly`, `priority: 0.7`;
   - результат — `public/sitemap.xml` в том же формате и с тем же отступом, что сейчас; `lastmod` статичных страниц — дата запуска;
   - если API недоступно или ответ не JSON — ошибка в stderr, ненулевой код выхода, **файл не трогать**.
   - Экранировать `&`, `<`, `>` в адресах.
2. `package.json`: скрипт `"sitemap": "node scripts/gen-sitemap.mjs"`.
3. `docs/TOOLING.md`: строка про `npm run sitemap` — запускать перед сборкой релиза, в Dockerfile не встроено (сборка может идти без доступа к API).
4. Запустить и закоммитить обновлённый `public/sitemap.xml`.

## Проверка исполнителем
- `npm run verify`, `npm test`, `npx ng build` — 0 ошибок.
- В `npm start`: открыть статью → `document.title`, `meta[name=description]`, `meta[property="og:image"]`, `link[rel=canonical]` и оба JSON-LD соответствуют статье; перейти по ссылке на другую статью — всё обновилось; уйти на `/home` — JSON-LD статьи пропал.
- JSON-LD прогнать через валидатор schema.org (validator.schema.org), если доступен; если нет — написать в отчёте.
- `WIKI_API_URL=http://127.0.0.1:1 npm run sitemap` → ошибка, `git diff public/sitemap.xml` пустой.

## Не делать
- пререндер статей и серверную загрузку данных — отдельное решение (нужно ли, и есть ли у сборки доступ к API);
- не менять SEO других страниц;
- не встраивать генерацию sitemap в Dockerfile или `ng build`.

## Отчёт
≤10 строк: что сделано, что нет, результаты проверок. `git commit` + `git push -u origin agent/005`.
