/**
 * Публичный API сущности «Оформление игрока»: баннеры, рамки аватара и их анимации.
 */

export type {
    BannerEffect,
    BannerEffectId,
    BannerTint,
    FrameEffect,
    FrameEffectId,
    PlayerLook,
    ProfileBanner,
    ProfileFrame,
    ProfileFrameId,
    StyleLock,
    StyleRequirement,
    StyleStats,
} from './model/player-style';
export { BANNER_EFFECTS, BANNER_NONE, FRAME_EFFECTS, PROFILE_BANNERS, PROFILE_FRAMES } from './lib/player-style.constant';
export { bannerById, defaultPlayerLook, styleCheckable, styleEarned, styleLock } from './lib/style-lock.function';
export { PlayerLookService } from './api/player-look.service';
export { BANNER_SHARD_PRICE } from './lib/player-style.constant';
export { PlayerFrameComponent } from './ui/player-frame/player-frame.component';
export { ProfileBannerComponent } from './ui/profile-banner/profile-banner.component';
export { PlayerAvatarComponent } from './ui/player-avatar/player-avatar.component';
