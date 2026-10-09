import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@core/i18n';
import { UserService } from '@entities/user';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { PlayerProfileService } from '../../api/player-profile.service';
import { PlayerProfile } from '../../model/player-profile';
import { ProfileStyleEditorComponent } from '../profile-style-editor/profile-style-editor.component';

/**
 * Раздел профиля «Оформление»: редактор баннера, рамки и титула.
 * Отдельный раздел, чтобы не сдвигать вниз «Как начать играть».
 */
@Component({
    selector: 'app-profile-style-page',
    template: `
        @if (profile(); as p) {
            <app-profile-style-editor [profile]="p" />
        } @else if (profile() === null) {
            <p class="flex items-center gap-2 text-ink-3" role="status">
                <tui-icon icon="@tui.user-round-search" class="size-5!" />
                {{ 'player.style.noProfile' | translate }}
            </p>
        } @else {
            <p class="flex items-center gap-2 text-ink-3" role="status">
                <tui-icon icon="@tui.loader" class="size-5! animate-spin" />
                {{ 'player.loading' | translate }}
            </p>
        }
    `,
    imports: [ProfileStyleEditorComponent, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileStylePageComponent {
    private readonly users = inject(UserService);
    private readonly profiles = inject(PlayerProfileService);

    /**
     * Свой профиль игрока: `undefined` — загружается, `null` — игрока ещё нет
     * в статистике сервера (не заходил в игру).
     */
    protected readonly profile = toSignal<PlayerProfile | null | undefined>(
        this.users.authSettled$.pipe(
            filter(Boolean),
            take(1),
            switchMap(() => this.users.getPlayer$(this.users.userId)),
            map((player) => player?.user_game_name ?? ''),
            switchMap((name) => (name ? this.profiles.load(name) : of(null))),
            catchError(() => of(null))
        ),
        { initialValue: undefined }
    );
}
