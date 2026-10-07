import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { TuiIcon } from '@taiga-ui/core';
import { PlayerBadge } from '../../model/player-badge';

/**
 * Значки игрока.
 *
 * `compact` — строка пилюль (описание в подсказке), `full` — карточки с описанием.
 */
@Component({
    selector: 'app-player-badges',
    templateUrl: './player-badges.component.html',
    styleUrl: './player-badges.component.less',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerBadgesComponent {
    /**
     * Значки.
     */
    public readonly badges = input.required<PlayerBadge[]>();

    /**
     * Вид.
     */
    public readonly variant = input<'compact' | 'full'>('compact');
}
