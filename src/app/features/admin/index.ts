/**
 * Публичный API слайса "Admin".
 *
 * Другие слайсы импортируют только отсюда: @features/admin.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export * from './admin.component';
export * from './moderate-settlement-request/active-tag/active-tag.component';
