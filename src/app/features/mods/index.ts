/**
 * Публичный API слайса "Mods".
 *
 * Другие слайсы импортируют только отсюда: @features/mods.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export { ModsPageComponent } from './ui/mods-page/mods-page.component';
export type { ServerMod } from './config/server-mods.constant';
