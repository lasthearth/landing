import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PlayerLookService } from '../../api/player-look.service';
import { PlayerFrameComponent } from '../player-frame/player-frame.component';

/**
 * Аватар игрока в его рамке оформления — для списков, чипов и шапки.
 * Размер задаёт родитель через ширину и высоту хоста.
 */
@Component({
    selector: 'app-player-avatar',
    template: `
        <app-player-frame
            class="player-avatar__frame"
            [src]="src()"
            [alt]="alt()"
            [frame]="look().frameId"
            [effect]="animated() ? look().frameEffect : 'none'"
            [compact]="compact()"
        />
    `,
    styles: `
        :host {
            display: block;
        }

        .player-avatar__frame {
            width: 100%;
            height: 100%;
        }
    `,
    imports: [PlayerFrameComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerAvatarComponent {
    private readonly looks = inject(PlayerLookService);

    /**
     * Игрок; `null` — неизвестный (простая рамка).
     */
    public readonly userId = input<string | null | undefined>(null);
    public readonly src = input('');
    public readonly alt = input('');

    /**
     * Показывать анимацию рамки (в мелких аватарах — нет).
     */
    public readonly animated = input(true);

    /**
     * Мелкий аватар: тонкая рамка без заклёпок.
     */
    public readonly compact = input(false);

    protected readonly look = computed(() => this.looks.lookOf(this.userId()));
}
