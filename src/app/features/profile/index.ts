/**
 * Публичный API слайса "Profile".
 *
 * Другие слайсы импортируют только отсюда: @features/profile.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export * from './create-settlement-from/create-settlement-from.component';
export * from './how-play/how-play.component';
export * from './profile-navigation/profile-navigation.component';
export * from './profile.component';
export * from './statistics/statistics.component';
