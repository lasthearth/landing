import { inject, Injectable } from '@angular/core';
import { PlayerLookService } from '@entities/player-style';
import { Observable } from 'rxjs';
import { PlayerBadgeKey } from '../model/player-badge';
import { PlayerProfile } from '../model/player-profile';
import { ProfileStyle } from '../model/profile-style';

/**
 * Оформление профиля: вид (баннер, рамка, анимации) и титул под ником.
 *
 * Всё хранится на сервере через `PlayerLookService` — он же показывает вид
 * во всех аватарах сайта. Здесь к виду добавляется титул.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStyleService {
    private readonly looks = inject(PlayerLookService);

    /**
     * Оформление игрока: сохранённое или по умолчанию.
     *
     * Титул — сохранённый, если значок у игрока ещё есть; иначе самый редкий значок.
     *
     * @param profile Игрок.
     * @returns Оформление.
     */
    public styleOf(profile: PlayerProfile): ProfileStyle {
        const saved = this.looks.titleOf(profile.userId);
        const owned = saved === '' || profile.badges.some((badge) => badge.key === saved);
        const titleKey: PlayerBadgeKey | null =
            saved !== undefined && owned ? ((saved || null) as PlayerBadgeKey | null) : (profile.badges[0]?.key ?? null);

        return { ...this.looks.lookOf(profile.userId, profile), titleKey };
    }

    /**
     * Меняет и сохраняет своё оформление.
     *
     * @param profile Свой профиль.
     * @param changes Что поменять.
     * @returns Завершение сохранения.
     */
    public update(profile: PlayerProfile, changes: Partial<ProfileStyle>): Observable<void> {
        const { titleKey, ...look } = { ...this.styleOf(profile), ...changes };
        return this.looks.save(profile.userId, look, titleKey ?? '');
    }

    /**
     * Возвращает оформление по умолчанию.
     *
     * @param profile Свой профиль.
     * @returns Завершение.
     */
    public reset(profile: PlayerProfile): Observable<void> {
        return this.looks.reset(profile.userId);
    }
}
