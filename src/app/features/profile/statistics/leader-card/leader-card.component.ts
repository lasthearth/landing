import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { PlayerAvatarComponent } from '@entities/player-style';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { RouterLink } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-leader-card',
    imports: [AmountPipe, RouterLink, PlayerAvatarComponent, TranslatePipe],
    templateUrl: './leader-card.component.html',
    styleUrl: './leader-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderCardComponent {
    public isBigSize: InputSignal<boolean> = input<boolean>(false);

    public playerName: InputSignal<string> = input.required<string>();

    public ratingPlace: InputSignal<string> = input.required<string>();

    public type: InputSignal<string> = input.required<string>();

    public count: InputSignal<number> = input.required<number>();

    public userImage: InputSignal<string | undefined> = input<string | undefined>();

    /**
     * Игрок — для его рамки.
     */
    public userId: InputSignal<string | undefined> = input<string | undefined>();

    public borderClass(): string {
        const place = this.ratingPlace();

        if (place === '1') {
            return 'card-frame--gold';
        }

        if (place === '2') {
            return 'card-frame--silver';
        }

        if (place === '3') {
            return 'card-frame--bronze';
        }

        return 'card-frame--default';
    }
}
