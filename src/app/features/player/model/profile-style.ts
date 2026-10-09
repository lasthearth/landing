import { PlayerLook } from '@entities/player-style';
import { PlayerBadgeKey } from './player-badge';

/**
 * Оформление профиля: вид (баннер, рамка, анимации) и титул под ником.
 */
export interface ProfileStyle extends PlayerLook {
    /**
     * Значок, чьё название показывается титулом под ником; `null` — без титула.
     */
    readonly titleKey: PlayerBadgeKey | null;
}
