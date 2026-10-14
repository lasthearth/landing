import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Разделы, которые собираются один раз при сборке: их содержимое меняется
 * не каждый день, а сборка не может ходить в API при каждом запросе.
 */
const PRERENDERED = [
    'rules',
    'faq',
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
];

/**
 * Список страниц задачи 007 (/players) сюда добавится вместе с её веткой.
 *
 * Страницы под авторизацией: в их HTML всегда гостевая оболочка, содержимое
 * рисует браузер после входа.
 */
const CLIENT_ONLY = ['profile', 'profile/**', 'wiki/edit/**', 'join/**'];

/**
 * Режимы рендера по адресам.
 *
 * Статьи вики, новости, поселения и игроки появляются каждый день, поэтому
 * рисуются на сервере по запросу (`RenderMode.Server`). Всё, что начинается
 * с `/`, отдаётся собранным заранее. Неизвестный адрес тоже идёт на сервер —
 * иначе приложение не смогло бы ответить на него кодом 404.
 */
export const serverRoutes: ServerRoute[] = [
    { path: '', renderMode: RenderMode.Prerender },
    ...PRERENDERED.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
    ...CLIENT_ONLY.map((path): ServerRoute => ({ path, renderMode: RenderMode.Client })),
    { path: 'wiki/:slug', renderMode: RenderMode.Server },
    { path: 'news/:id', renderMode: RenderMode.Server },
    { path: 'settlements/:id', renderMode: RenderMode.Server },
    { path: 'player/:nick', renderMode: RenderMode.Server },
    { path: '**', renderMode: RenderMode.Server },
];
