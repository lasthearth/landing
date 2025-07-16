import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';
import { TuiIcon } from '@taiga-ui/core';

@Component({
    selector: 'app-knight-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './knight-title.component.html',
    styleUrl: './knight-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnightTitleComponent {
    protected readonly gameItems = inject(TitlesService).knightGameItems;
}
