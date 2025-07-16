import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';

@Component({
    selector: 'app-baron-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './baron-title.component.html',
    styleUrl: './baron-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaronTitleComponent {
    protected readonly gameItems = inject(TitlesService).baronGameItems;
}
