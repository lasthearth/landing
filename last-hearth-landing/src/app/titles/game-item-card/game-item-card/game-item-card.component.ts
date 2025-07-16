import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { IGameItemCard } from '../../interfaces/i-game-item';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

@Component({
    selector: 'app-game-item-card',
    imports: [TuiBadgedContent, TuiBadgeNotification],
    templateUrl: './game-item-card.component.html',
    styleUrl: './game-item-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameItemCardComponent {
    public data: InputSignal<IGameItemCard> = input.required();
}
