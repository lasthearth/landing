import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Разделы вики: у каждого свой адрес `/wiki/razdel/<раздел>`.
 */
const WIKI_SECTIONS = ['start', 'settlements', 'war', 'economy', 'world', 'help'];

/**
 * Разделы, которые собираются один раз при сборке: их содержимое меняется
 * не каждый день, а сборка не может ходить в API при каждом запросе.
 */
const PRERENDERED = [
    'rules',
    'faq',
    'about',
    'news',
    'start-game',
    'market',
    'privacy-policy',
    'public-offer',
    'wiki',
    'settlements',
    'gallery',
    'videos',
    'diplomacy',
    'events',
    'lfg',
    'players',
];

/**
 * Страницы под авторизацией: в их HTML всегда гостевая оболочка, содержимое
 * рисует браузер после входа.
 */
const CLIENT_ONLY = ['profile', 'profile/**', 'wiki/edit/**', 'join/**'];

/**
 * Режимы рендера по адресам.
 *
 * Статьи вики, новости, поселения, игроки и моды меняются без выкладки, поэтому
 * рисуются на сервере по запросу (`RenderMode.Server`). Всё, что начинается
 * с `/`, отдаётся собранным заранее. Неизвестный адрес тоже идёт на сервер —
 * иначе приложение не смогло бы ответить на него кодом 404.
 */
export const serverRoutes: ServerRoute[] = [
    { path: '', renderMode: RenderMode.Prerender },
    ...PRERENDERED.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
    ...CLIENT_ONLY.map((path): ServerRoute => ({ path, renderMode: RenderMode.Client })),
    // Разделы вики: у роутов есть параметр, поэтому список адресов для предсборки
    // задаётся явно (getPrerenderParams), иначе Angular не знает, что собирать.
    {
        path: 'wiki/razdel/:section',
        renderMode: RenderMode.Prerender,
        getPrerenderParams: async () => WIKI_SECTIONS.map((section) => ({ section })),
    },
    { path: 'wiki/:slug', renderMode: RenderMode.Server },
    { path: 'news/:id', renderMode: RenderMode.Server },
    { path: 'settlements/:id', renderMode: RenderMode.Server },
    { path: 'player/:nick', renderMode: RenderMode.Server },
    // Список модов ведут в админке, он меняется без выкладки сайта.
    { path: 'mods', renderMode: RenderMode.Server },
    // Карта: глашатаев ставят в игре, позиция меняется без выкладки. При пререндере
    // в страницу навсегда попадал снимок на момент сборки.
    { path: 'map', renderMode: RenderMode.Server },
    { path: '**', renderMode: RenderMode.Server },
];
