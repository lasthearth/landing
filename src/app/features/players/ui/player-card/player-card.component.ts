import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { PlayerFrameComponent, PlayerLook } from '@entities/player-style';
import { ISettlement, SettlementDisplayNamePipe, SettlementRole } from '@entities/settlement';
import { PlayerListItem } from '@entities/user';
import { RelativeTimeComponent } from '@shared/ui/relative-time';

/**
 * Карточка игрока в списке `/players`.
 *
 * Целиком ссылка на профиль: кликабельный `div` ломает клавиатуру
 * и скринридеры. Оформление (рамка аватара) приходит снаружи, чтобы
 * страница доставала его одним вычислением на весь список.
 */
@Component({
    selector: 'app-player-card',
    imports: [RouterLink, TranslatePipe, TuiIcon, PlayerFrameComponent, RelativeTimeComponent, SettlementDisplayNamePipe],
    templateUrl: './player-card.component.html',
    styleUrl: './player-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
    /**
     * Игрок.
     */
    public readonly player = input.required<PlayerListItem>();

    /**
     * Оформление игрока: рамка аватара и её анимация.
     */
    public readonly look = input.required<PlayerLook>();

    /**
     * Поселение игрока; `null` — без поселения.
     */
    public readonly settlement = input<ISettlement | null>(null);

    /**
     * Роль игрока в поселении.
     */
    public readonly role = input<SettlementRole | null>(null);
}
