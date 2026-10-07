/**
 * Публичный API фичи «Игрок»: значки и сбор профиля. Страница игрока подключается роутом напрямую.
 */
export { PlayerBadgesComponent } from './ui/player-badges/player-badges.component';
export { PlayerProfileService } from './api/player-profile.service';
export { computePlayerBadges } from './lib/compute-player-badges.function';
export type { PlayerBadge } from './model/player-badge';
export type { PlayerProfile } from './model/player-profile';
