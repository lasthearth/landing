import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';

@Component({
    selector: 'app-duke-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './duke-title.component.html',
    styleUrl: './duke-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DukeTitleComponent {
    protected readonly gameItems = inject(TitlesService).dukeGameItems;
}
